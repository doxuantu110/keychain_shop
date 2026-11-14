/**
 * Admin Order Management Controller
 * Handles administrative order operations:
 * 1. GET /api/admin/orders - Paginated, filtered & searchable order list
 * 2. GET /api/admin/orders/stats - Real-time KPI order counts by date range
 * 3. GET /api/admin/orders/:id - Complete order details, snapshots, payments, history & email logs
 * 4. PATCH /api/admin/orders/:id/status - State machine transitions, atomic stock restoration, email trigger
 * 5. POST /api/admin/orders/:id/notes - Save admin private internal notes
 * 6. POST /api/admin/orders/:id/resend-email - Manual resend of transactional emails with audit log
 */

const prisma = require('../utills/db');
const emailService = require('../services/emailService');
const emailOutboxService = require('../services/email/emailOutboxService');

const VALID_STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

function isValidStatusTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

async function syncProductInStock(tx, productId) {
  const activeVariantWithStock = await tx.productVariant.findFirst({
    where: {
      productId,
      isActive: true,
      OR: [{ stock: { gt: 0 } }, { allowPreorder: true }],
    },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      inStock: activeVariantWithStock ? 1 : 0,
    },
  });
}

function getDateFilter(dateRange, startDate, endDate) {
  const now = new Date();
  if (startDate || endDate) {
    const filter = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }

  switch (dateRange) {
    case 'today': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { gte: todayStart };
    }
    case '7d': {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { gte: sevenDaysAgo };
    }
    case '30d': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return { gte: thirtyDaysAgo };
    }
    case 'all':
    default:
      return undefined;
  }
}

/**
 * 1. GET /api/admin/orders
 */
async function getAdminOrders(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { status, paymentStatus, paymentMethod, q, query, dateRange, startDate, endDate } = req.query;
    const searchTerm = (q || query || '').trim();

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus.toUpperCase();
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod.toUpperCase();
    }

    const dateFilter = getDateFilter(dateRange, startDate, endDate);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    if (searchTerm) {
      where.OR = [
        { orderCode: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
        { name: { contains: searchTerm } },
        { lastname: { contains: searchTerm } },
        { fullName: { contains: searchTerm } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.customer_order.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  mainImage: true,
                  slug: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  sizeLabel: true,
                  sku: true,
                  price: true,
                },
              },
            },
          },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.customer_order.count({ where }),
    ]);

    return res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[AdminOrders] Error fetching orders:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * 2. GET /api/admin/orders/stats
 */
async function getAdminOrderStats(req, res) {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const dateFilter = getDateFilter(dateRange, startDate, endDate);
    const baseWhere = dateFilter ? { createdAt: dateFilter } : {};

    const [
      total,
      pending,
      pendingPayment,
      paid,
      confirmed,
      processing,
      shipped,
      delivered,
      cancelled,
    ] = await Promise.all([
      prisma.customer_order.count({ where: baseWhere }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'PENDING_PAYMENT' } }),
      prisma.customer_order.count({ where: { ...baseWhere, paymentStatus: 'PAID' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'CONFIRMED' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'PROCESSING' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'SHIPPED' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'DELIVERED' } }),
      prisma.customer_order.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    ]);

    // Calculate revenue from paid orders or delivered COD orders
    const revenueOrders = await prisma.customer_order.findMany({
      where: {
        ...baseWhere,
        OR: [
          { paymentStatus: 'PAID' },
          { status: 'DELIVERED', paymentMethod: 'COD' },
        ],
      },
      select: { total: true },
    });

    const totalRevenue = revenueOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);

    return res.status(200).json({
      total,
      pending,
      pendingPayment,
      paid,
      confirmed,
      processing,
      shipped,
      delivered,
      cancelled,
      totalRevenue,
    });
  } catch (error) {
    console.error('[AdminOrders] Error fetching stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * 3. GET /api/admin/orders/:id
 */
async function getAdminOrderDetail(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const order = await prisma.customer_order.findFirst({
      where: {
        OR: [{ id }, { orderCode: id }],
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                mainImage: true,
                price: true,
                arEnabled: true,
                glbUrl: true,
                usdzUrl: true,
              },
            },
            variant: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Không tìm thấy thông tin đơn hàng với mã yêu cầu',
      });
    }

    // Retrieve email outbox logs for this order
    const emailLogs = await prisma.emailOutbox.findMany({
      where: {
        OR: [{ orderId: order.id }, { orderCode: order.orderCode }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      ...order,
      emailLogs,
    });
  } catch (error) {
    console.error('[AdminOrders] Error fetching order detail:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * 4. PATCH /api/admin/orders/:id/status
 * State machine transition + atomic stock restore on cancel + outbox email trigger
 * Strictly forbids arbitrary manual update of paymentStatus to PAID
 */
async function updateAdminOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note, trackingCode, carrier, reason } = req.body || {};

    if (!id || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Phải cung cấp order ID và status mới',
      });
    }

    const order = await prisma.customer_order.findFirst({
      where: { OR: [{ id }, { orderCode: id }] },
      include: { products: true },
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        details: 'Đơn hàng không tồn tại',
      });
    }

    const newStatus = status.toUpperCase();

    // Check state machine validity
    if (!isValidStatusTransition(order.status, newStatus)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        details: `Không thể chuyển trạng thái từ "${order.status}" sang "${newStatus}". Các trạng thái hợp lệ tiếp theo: ${VALID_STATUS_TRANSITIONS[order.status]?.join(', ') || 'Không có (đơn hàng đã hoàn thành hoặc đã hủy)'}.`,
      });
    }

    const adminIdentity = req.user?.email || req.headers['x-user-email'] || 'ADMIN';

    // 1. CANCELLATION FLOW WITH ATOMIC TRANSACTION & STOCK RESTORATION
    if (newStatus === 'CANCELLED') {
      const cancelReason = reason || note || 'Hủy bởi Quản trị viên';

      const transactionResult = await prisma.$transaction(async (tx) => {
        // Atomic conditional check: only update if currently not CANCELLED or DELIVERED
        const cancelData = { status: 'CANCELLED' };
        let refundNote = '';

        // Nếu đơn hàng đã thanh toán trước đó (chuyển khoản SePay hoặc COD đã thu tiền)
        // Kích hoạt Manual Refund Workflow và đánh dấu REFUND_PENDING
        if (order.paymentStatus === 'PAID') {
          cancelData.paymentStatus = 'REFUND_PENDING';
          refundNote = ` [HOÀN TIỀN THỦ CÔNG] Đơn hàng đã thanh toán ${order.total}đ. Yêu cầu chủ shop/kế toán thực hiện chuyển khoản hoàn tiền thủ công cho khách hàng.`;
        }

        const cancelResult = await tx.customer_order.updateMany({
          where: {
            id: order.id,
            status: { notIn: ['CANCELLED', 'DELIVERED'] },
          },
          data: cancelData,
        });

        if (cancelResult.count === 0) {
          return null; // Already cancelled or delivered
        }

        // Restock non-preorder items atomically within the same transaction
        for (const item of order.products) {
          if (item.variantId && item.snapshotSource !== 'CHECKOUT_PREORDER') {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
            await syncProductInStock(tx, item.productId);
          }
        }

        // Log status history within the transaction
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: 'CANCELLED',
            note: `Đơn hàng đã bị hủy. Lý do: "${cancelReason}". Tồn kho thực tế đã được hoàn lại.${refundNote}`,
            changedBy: adminIdentity,
          },
        });

        // Transactional Outbox: Đưa email hủy đơn vào outbox ngay trong transaction
        await emailService.sendOrderCancelled(order, cancelReason, tx);

        return await tx.customer_order.findUnique({
          where: { id: order.id },
          include: { statusHistory: { orderBy: { createdAt: 'asc' } }, payments: true },
        });
      });

      if (!transactionResult) {
        return res.status(400).json({
          error: 'Cannot cancel order',
          details: 'Đơn hàng đã ở trạng thái CANCELLED hoặc DELIVERED',
        });
      }

      // Trigger background outbox processing post-commit
      emailService.processOutbox().catch((err) => {
        console.warn('[AdminOrders] Failed to trigger outbox post-commit:', err.message);
      });

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully and stock restored',
        order: transactionResult,
      });
    }

    // 2. STANDARD STATE TRANSITIONS
    const updateData = { status: newStatus };

    // If marked DELIVERED and COD, mark payment as PAID and Payment as SUCCESS
    if (newStatus === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID') {
      updateData.paymentStatus = 'PAID';
      await prisma.payment.updateMany({
        where: {
          orderId: order.id,
          provider: 'COD',
          status: 'PENDING',
        },
        data: { status: 'SUCCESS' },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.customer_order.update({
        where: { id: order.id },
        data: updateData,
      });

      const historyNote = note || `Chuyển trạng thái đơn hàng sang ${newStatus}`;
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          note: trackingCode ? `${historyNote} (Mã bưu tá: ${trackingCode}, Đơn vị: ${carrier || 'Giao Hàng'})` : historyNote,
          changedBy: adminIdentity,
        },
      });

      return ord;
    });

    // 3. TRIGGER CORRESPONDING OUTBOX EMAIL NOTIFICATION
    try {
      const fullOrderForEmail = await prisma.customer_order.findUnique({
        where: { id: order.id },
        include: { products: true },
      });

      if (newStatus === 'CONFIRMED') {
        emailService.sendOrderConfirmed(fullOrderForEmail, note).catch((e) => console.warn(e.message));
      } else if (newStatus === 'SHIPPED') {
        emailService.sendOrderShipped(fullOrderForEmail, { carrier, trackingCode, note }).catch((e) => console.warn(e.message));
      } else if (newStatus === 'DELIVERED') {
        emailService.sendOrderDelivered(fullOrderForEmail).catch((e) => console.warn(e.message));
      } else if (newStatus === 'PROCESSING') {
        emailService.sendOrderStatusUpdate(fullOrderForEmail, 'PROCESSING', note).catch((e) => console.warn(e.message));
      }
    } catch (mailErr) {
      console.warn('[AdminOrders] Error triggering status email:', mailErr.message);
    }

    const refreshedOrder = await prisma.customer_order.findUnique({
      where: { id: order.id },
      include: {
        products: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: refreshedOrder,
    });
  } catch (error) {
    console.error('[AdminOrders] Error updating status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * 5. POST /api/admin/orders/:id/notes
 * Save admin-only internal notes
 */
async function saveAdminOrderNotes(req, res) {
  try {
    const { id } = req.params;
    const { note, internalNotes } = req.body || {};
    const noteContent = (internalNotes !== undefined ? internalNotes : note || '').trim();

    if (!id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const order = await prisma.customer_order.findFirst({
      where: { OR: [{ id }, { orderCode: id }] },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const adminIdentity = req.user?.email || req.headers['x-user-email'] || 'ADMIN';

    // Update internalNotes column
    const updated = await prisma.customer_order.update({
      where: { id: order.id },
      data: { internalNotes: noteContent },
    });

    // Also record in status history for audit timeline
    if (noteContent) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          note: `[GHI CHÚ NỘI BỘ] ${noteContent}`,
          changedBy: adminIdentity,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Internal note saved successfully',
      internalNotes: updated.internalNotes,
    });
  } catch (error) {
    console.error('[AdminOrders] Error saving note:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * 6. POST /api/admin/orders/:id/resend-email
 * Manual resend of transactional emails with audit trail
 */
async function resendAdminOrderEmail(req, res) {
  try {
    const { id } = req.params;
    const { outboxId, eventType } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const order = await prisma.customer_order.findFirst({
      where: { OR: [{ id }, { orderCode: id }] },
      include: { products: true, payments: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const adminIdentity = req.user?.email || req.headers['x-user-email'] || 'ADMIN';

    // 1. Resend by outboxId if provided
    if (outboxId) {
      const result = await emailOutboxService.resendEmail({
        outboxId,
        adminUser: adminIdentity,
      });

      return res.status(200).json({
        success: true,
        message: 'Email resent successfully',
        result,
      });
    }

    // 2. Trigger fresh queue event by eventType
    const type = (eventType || 'ORDER_CONFIRMATION').toUpperCase();

    // Check if an existing outbox record already exists for this order & eventType
    const existingOutbox = await prisma.emailOutbox.findFirst({
      where: {
        orderId: order.id,
        eventType: type,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOutbox) {
      const result = await emailOutboxService.resendEmail({
        outboxId: existingOutbox.id,
        adminUser: adminIdentity,
      });

      return res.status(200).json({
        success: true,
        message: `Email [${type}] resent successfully via dedicated outbox record`,
        result,
      });
    }

    let queueResult;
    const resendKey = `MANUAL_RESEND-${type}-${order.orderCode}-${Date.now()}`;
    const emailTemplates = require('../services/email/emailTemplates');
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    switch (type) {
      case 'ORDER_CONFIRMATION': {
        const tpl = emailTemplates.templateOrderConfirmation(order, baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_CONFIRMATION',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'PAYMENT_INSTRUCTIONS': {
        const checkoutUrl = `${baseUrl}/order-confirmation?orderCode=${order.orderCode}&payment=bank`;
        const tpl = emailTemplates.templatePaymentInstructions(order, checkoutUrl, baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'PAYMENT_INSTRUCTIONS',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'PAYMENT_SUCCESS': {
        const payment = order.payments?.find((p) => p.status === 'SUCCESS') || order.payments?.[0] || {};
        const tpl = emailTemplates.templatePaymentSuccess(order, {
          txnRef: payment.txnRef || `MANUAL-${Date.now()}`,
          amount: payment.amount || order.total,
        }, baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'PAYMENT_SUCCESS',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'ORDER_CONFIRMED': {
        const tpl = emailTemplates.templateOrderConfirmed(order, 'Gửi lại từ quản trị viên', baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_CONFIRMED',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'ORDER_SHIPPED': {
        const tpl = emailTemplates.templateOrderShipped(order, { note: 'Gửi lại thông báo giao hàng' }, baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_SHIPPED',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'ORDER_DELIVERED': {
        const tpl = emailTemplates.templateOrderDelivered(order, baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_DELIVERED',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      case 'ORDER_CANCELLED': {
        const tpl = emailTemplates.templateOrderCancelled(order, 'Thông báo hủy gửi lại từ quản trị viên', baseUrl);
        queueResult = await emailOutboxService.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_CANCELLED',
          recipient: order.email,
          subject: tpl.subject,
          htmlContent: tpl.html,
          textContent: tpl.text,
          idempotencyKey: resendKey,
        });
        break;
      }
      default:
        return res.status(400).json({
          error: 'Invalid eventType',
          details: `eventType "${type}" không được hỗ trợ. Các loại hợp lệ: ORDER_CONFIRMATION, PAYMENT_INSTRUCTIONS, PAYMENT_SUCCESS, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED`,
        });
    }

    // Record audit in OrderStatusHistory
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        note: `Admin [${adminIdentity}] đã yêu cầu gửi lại email [${type}] tới ${order.email}`,
        changedBy: adminIdentity,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Email [${type}] queued for sending to ${order.email}`,
      queueResult,
    });
  } catch (error) {
    console.error('[AdminOrders] Error resending email:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

module.exports = {
  getAdminOrders,
  getAdminOrderStats,
  getAdminOrderDetail,
  updateAdminOrderStatus,
  saveAdminOrderNotes,
  resendAdminOrderEmail,
};

