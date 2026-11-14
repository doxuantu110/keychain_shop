/**
 * SePay Payment Controller
 * Handles:
 * 1. POST /api/payments/sepay/checkout-session (Generate form fields with HMAC-SHA256 signature)
 * 2. POST /api/payments/sepay/ipn (Server-to-server webhook callback with secret verification & idempotency)
 * 3. GET /api/payments/sepay/status/:orderCode (Check current payment status)
 */

const prisma = require('../utills/db');
const sepayService = require('../services/sepayService');
const emailService = require('../services/emailService');
const { checkIsAdmin } = require('../middleware/auth');

/**
 * Khởi tạo phiên thanh toán SePay (sinh form fields + chữ ký HMAC-SHA256)
 * POST /api/payments/sepay/checkout-session
 */
async function createCheckoutSession(req, res) {
  try {
    const { orderCode, email, phone } = req.body || {};

    if (!orderCode || typeof orderCode !== 'string') {
      return res.status(400).json({
        error: 'Missing orderCode',
        details: 'Vui lòng cung cấp mã đơn hàng',
      });
    }

    const cleanCode = orderCode.trim();
    const order = await prisma.customer_order.findFirst({
      where: {
        OR: [{ id: cleanCode }, { orderCode: cleanCode }],
      },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Không tìm thấy thông tin đơn hàng',
      });
    }

    // Kiểm tra quyền truy cập: Admin hoặc khớp email/phone
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      const verifyEmail = (email || req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();
      const verifyPhone = (phone || req.query.phone || '').trim();

      const isOwner = (verifyEmail && verifyEmail === order.email.toLowerCase()) ||
                      (verifyPhone && verifyPhone === order.phone);

      if (!isOwner) {
        return res.status(403).json({
          error: 'Access denied',
          details: 'Vui lòng cung cấp email hoặc số điện thoại đặt hàng để tạo phiên thanh toán',
        });
      }
    }

    // Nếu đơn đã thanh toán xong
    if (order.paymentStatus === 'PAID') {
      return res.status(200).json({
        status: 'ALREADY_PAID',
        orderCode: order.orderCode,
        message: 'Đơn hàng đã được thanh toán thành công trước đó.',
      });
    }

    // Khởi tạo Checkout Session từ SePay SDK
    const session = sepayService.createCheckoutSession({
      orderCode: order.orderCode,
      amount: order.total,
      description: `Thanh toan don hang ${order.orderCode}`,
    });

    // Cập nhật hoặc tạo bản ghi Payment trong database
    const existingPayment = order.payments.find((p) => p.provider === 'SEPAY');
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'SEPAY',
          txnRef: `SEPAY-${order.orderCode}`,
          amount: order.total,
          status: 'PENDING',
        },
      });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error('[PaymentController] Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Checkout session creation failed',
      details: error.message || 'Không thể tạo phiên thanh toán SePay',
    });
  }
}

/**
 * Xử lý IPN (Instant Payment Notification) từ Cổng thanh toán SePay
 * POST /api/payments/sepay/ipn
 */
async function handleSepayIpn(req, res) {
  try {
    // 1. Xác thực bảo mật Request (Header X-Secret-Key hoặc Authorization Bearer)
    const isAuthorized = sepayService.verifyIpnAuth(req.headers);
    if (!isAuthorized) {
      console.warn('[SePay IPN] Unauthorized request rejected. Headers:', JSON.stringify(req.headers));
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid SePay Secret Key',
      });
    }

    const payload = req.body || {};
    console.log('[SePay IPN] Received notification payload:', JSON.stringify(payload));

    // 2. Trích xuất thông tin đơn hàng và giao dịch từ IPN payload
    // SePay Gateway chuẩn gửi: { notification_type: 'ORDER_PAID', order: { order_invoice_number, order_amount, order_status, ... }, transaction: { id, amount } }
    const orderData = payload.order || {};
    const transactionData = payload.transaction || {};

    const invoiceNumber = orderData.order_invoice_number || payload.order_invoice_number || payload.orderCode;
    const notificationType = payload.notification_type || payload.type;
    const orderStatus = orderData.order_status || payload.order_status || payload.status;
    const rawAmount = orderData.order_amount || transactionData.amount || payload.amount || payload.order_amount;
    const paidAmount = Math.round(parseFloat(rawAmount));
    const txnId = String(transactionData.id || orderData.id || payload.id || `TXN-${Date.now()}`);

    if (!invoiceNumber) {
      console.warn('[SePay IPN] Missing order invoice number in payload');
      return res.status(400).json({ error: 'Missing order_invoice_number' });
    }

    // 3. Tìm đơn hàng trong cơ sở dữ liệu
    const order = await prisma.customer_order.findUnique({
      where: { orderCode: invoiceNumber.trim() },
      include: {
        products: true,
        payments: true,
      },
    });

    if (!order) {
      console.warn(`[SePay IPN] Order with code ${invoiceNumber} not found`);
      return res.status(404).json({ error: 'Order not found', orderCode: invoiceNumber });
    }

    // 4. Kiểm tra loại thông báo và trạng thái thanh toán từ SePay
    // Chấp nhận ORDER_PAID hoặc order_status CAPTURED
    const isPaidEvent = notificationType === 'ORDER_PAID' || orderStatus === 'CAPTURED';
    if (!isPaidEvent) {
      console.log(`[SePay IPN] Ignored event type: ${notificationType}, status: ${orderStatus}`);
      return res.status(200).json({ success: true, message: `Notification ${notificationType} acknowledged` });
    }

    // 5. Thẩm định số tiền (SSOT: Phải khớp chính xác với order.total trong DB)
    if (paidAmount !== order.total) {
      console.error(`[SePay IPN] Amount mismatch for order ${order.orderCode}: expected ${order.total}, received ${paidAmount}`);
      return res.status(400).json({
        error: 'Amount mismatch',
        expected: order.total,
        received: paidAmount,
      });
    }

    // 6. IDEMPOTENCY: Nếu đơn hàng đã là PAID, trả về HTTP 200 ngay lập tức, không lặp lại cập nhật hay gửi email
    if (order.paymentStatus === 'PAID') {
      console.log(`[SePay IPN] Idempotent replay: Order ${order.orderCode} already marked as PAID.`);
      return res.status(200).json({
        success: true,
        message: 'Order already marked as PAID (Idempotent replay)',
      });
    }

    // 6b. CANCELLATION RACE CONDITION: Nếu đơn hàng đã bị CANCELLED trước khi nhận tiền,
    // TUYỆT ĐỐI không hồi sinh đơn hàng thành CONFIRMED/PAID!
    // Ghi nhận thanh toán với trạng thái REFUND_PENDING để kích hoạt Manual Refund Workflow.
    if (order.status === 'CANCELLED') {
      console.warn(`[SePay IPN] Order ${order.orderCode} was already CANCELLED. Flagging for manual refund.`);
      await prisma.$transaction(async (tx) => {
        await tx.customer_order.update({
          where: { id: order.id },
          data: { paymentStatus: 'REFUND_PENDING' },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'SEPAY',
            txnRef: txnId,
            amount: paidAmount,
            status: 'REFUND_PENDING',
            bankCode: transactionData.bank_code || orderData.payment_method || 'VIETQR',
            rawResponse: payload,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'CANCELLED',
            toStatus: 'CANCELLED',
            note: `[HOÀN TIỀN THỦ CÔNG] Nhận được chuyển khoản SePay ${paidAmount}đ (Mã giao dịch: ${txnId}) sau khi đơn hàng đã bị hủy. Đơn hàng giữ nguyên trạng thái CANCELLED. Vui lòng thực hiện hoàn tiền thủ công cho khách hàng.`,
            changedBy: 'GATEWAY_WEBHOOK',
          },
        });
      });

      return res.status(200).json({
        success: true,
        warning: 'ORDER_ALREADY_CANCELLED',
        message: 'Đơn hàng đã bị hủy trước khi nhận tiền. Giao dịch đã được ghi nhận vào danh sách hoàn tiền thủ công (Manual Refund Workflow).',
        orderCode: order.orderCode,
      });
    }

    // 7. Thực thi cập nhật trạng thái đơn hàng & bản ghi thanh toán nguyên tử trong Prisma Transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Kiểm tra race condition nếu đơn vừa bị hủy trong lúc đang xử lý IPN
      const liveOrder = await tx.customer_order.findUnique({ where: { id: order.id } });
      if (liveOrder.status === 'CANCELLED') {
        const err = new Error('ORDER_CANCELLED_RACE');
        err.code = 'ORDER_CANCELLED_RACE';
        throw err;
      }

      // a. Cập nhật Customer_order
      const ord = await tx.customer_order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: (order.status === 'PENDING' || order.status === 'PENDING_PAYMENT') ? 'CONFIRMED' : order.status,
        },
      });

      // b. Cập nhật hoặc tạo bản ghi Payment
      const existingPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          provider: 'SEPAY',
        },
      });

      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: 'SUCCESS',
            txnRef: txnId,
            amount: paidAmount,
            bankCode: transactionData.bank_code || orderData.payment_method || 'VIETQR',
            rawResponse: payload,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'SEPAY',
            txnRef: txnId,
            amount: paidAmount,
            status: 'SUCCESS',
            bankCode: transactionData.bank_code || orderData.payment_method || 'VIETQR',
            rawResponse: payload,
          },
        });
      }

      // c. Ghi nhật ký trạng thái đơn hàng OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: ord.status,
          note: `Xác nhận thanh toán SePay VietQR thành công qua IPN (Mã giao dịch: ${txnId})`,
          changedBy: 'GATEWAY_WEBHOOK',
        },
      });

      // d. Transactional Outbox: Đưa email xác nhận thanh toán vào Outbox ngay trong cùng Transaction
      await emailService.sendPaymentSuccess(order, {
        txnRef: txnId,
        amount: paidAmount,
      }, tx);

      return ord;
    });

    console.log(`[SePay IPN] Order ${updatedOrder.orderCode} successfully transitioned to PAID / CONFIRMED.`);

    // 8. Kích hoạt worker xử lý Outbox asynchronously post-commit
    emailService.processOutbox().catch((emailErr) => {
      console.warn('[SePay IPN] Post-commit outbox trigger warning:', emailErr.message);
    });

    // 9. Trả về HTTP 200 OK cho SePay
    return res.status(200).json({
      success: true,
      message: 'IPN processed successfully',
      orderCode: updatedOrder.orderCode,
    });
  } catch (error) {
    console.error('[SePay IPN] Server error while processing IPN:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Kiểm tra trạng thái thanh toán đơn hàng (dành cho frontend polling / checking)
 * GET /api/payments/sepay/status/:orderCode
 */
async function getPaymentStatus(req, res) {
  try {
    const { orderCode } = req.params;
    if (!orderCode) {
      return res.status(400).json({ error: 'Missing orderCode' });
    }

    const order = await prisma.customer_order.findFirst({
      where: {
        OR: [{ id: orderCode.trim() }, { orderCode: orderCode.trim() }],
      },
      select: {
        id: true,
        orderCode: true,
        total: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error('[PaymentController] Error getting payment status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createCheckoutSession,
  handleSepayIpn,
  getPaymentStatus,
};

