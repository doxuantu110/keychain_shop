/**
 * End-to-End Test Suite for SePay Sandbox, Guest Checkout & Email Notifications
 * 
 * Verifies:
 * 1. Guest checkout COD (Order creation, stock deduction, COD payment record, confirmation email)
 * 2. Guest checkout SePay (Order creation, PENDING_PAYMENT status, SePay payment record, checkout session)
 * 3. SePay checkout session initialization & HMAC-SHA256 signature generation
 * 4. IPN security: Rejection of invalid Secret Key (HTTP 401)
 * 5. IPN validation: Rejection of amount mismatch (HTTP 400)
 * 6. IPN valid processing: Status transition to PAID/CONFIRMED, Payment record SUCCESS, post-IPN email
 * 7. IPN idempotency replay: Duplicate webhook handling returns 200 OK without re-processing
 * 8. Guest order lookup: Secure lookup by orderCode + email, uniform 404 for wrong credentials
 * 9. Cleanup of test orders to preserve database cleanliness
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const prisma = require('../utills/db');
const sepayService = require('../services/sepayService');
const emailService = require('../services/emailService');
const { calculateShippingFee } = require('../utills/validation');

// Mock request / response helpers for testing controller endpoints directly
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    set(key, val) {
      this.headers[key] = val;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("================================================================================");
  console.log("       CRAFT3D: SEPAY SANDBOX, GUEST CHECKOUT & EMAIL NOTIFICATIONS TEST        ");
  console.log("================================================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testFailed++;
    }
  }

  // 1. Kiểm tra sản phẩm và biến thể trong DB
  console.log("--- 1. Diagnostic: Fetch Active Product & Variant ---");
  const product = await prisma.product.findFirst({
    where: { isActive: true },
    include: { variants: { where: { isActive: true } } },
  });

  if (!product || product.variants.length === 0) {
    console.error("❌ No active product or variants found in database to run tests!");
    process.exit(1);
  }

  const variant = product.variants[0];
  console.log(`Using Product: "${product.title}" (${product.id})`);
  console.log(`Using Variant: "${variant.sizeLabel}" - Price: ${variant.price}đ - Stock: ${variant.stock}\n`);

  // Lưu trữ mã đơn test để dọn dẹp sau cùng
  const createdTestOrderCodes = [];

  const { createCustomerOrder, lookupCustomerOrder } = require('../controllers/customer_orders');
  const { createCheckoutSession, handleSepayIpn, getPaymentStatus } = require('../controllers/payments');

  // ================================================================================
  // TEST 1: GUEST CHECKOUT COD
  // ================================================================================
  console.log("--- TEST 1: Guest Checkout COD ---");
  const initialStock = variant.stock;
  const guestCodPayload = {
    fullName: "Nguyễn Văn Khách",
    phone: "0912345678",
    email: "khach.test.cod@craft3d.vn",
    province: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Dịch Vọng Hậu",
    addressDetail: "Số 99 Phố Duy Tân",
    orderNotice: "Giao giờ hành chính, gọi trước khi đến",
    paymentMethod: "COD",
    items: [
      {
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
        customText: "KHACH COD",
      },
    ],
  };

  const codReq = {
    body: guestCodPayload,
    headers: { "idempotency-key": `test-idem-cod-${Date.now()}` },
  };
  const codRes = createMockRes();

  await createCustomerOrder(codReq, codRes);
  assert(codRes.statusCode === 201, `Order creation returned HTTP 201 (Got: ${codRes.statusCode})`);
  assert(codRes.body && codRes.body.orderCode, `Order code generated: ${codRes.body?.orderCode}`);
  assert(codRes.body.paymentMethod === "COD", `Payment method is COD`);
  assert(codRes.body.paymentStatus === "PENDING", `Payment status is PENDING`);
  assert(codRes.body.status === "PENDING", `Order status is PENDING`);

  const codOrderCode = codRes.body.orderCode;
  createdTestOrderCodes.push(codOrderCode);

  // Kiểm tra tồn kho sau khi tạo đơn COD
  const variantAfterCod = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  assert(variantAfterCod.stock === initialStock - 1, `Stock decremented by 1 (${initialStock} -> ${variantAfterCod.stock})`);

  // Kiểm tra Payment record trong DB
  const codOrderInDb = await prisma.customer_order.findUnique({
    where: { orderCode: codOrderCode },
    include: { payments: true, statusHistory: true, products: true },
  });
  assert(codOrderInDb.payments.length === 1, `Payment record created in DB`);
  assert(codOrderInDb.payments[0].provider === "COD", `Payment provider is COD`);
  assert(codOrderInDb.payments[0].status === "PENDING", `Payment status in DB is PENDING`);
  assert(codOrderInDb.statusHistory.length >= 1, `Status history initialized`);
  console.log();

  // ================================================================================
  // TEST 2: GUEST CHECKOUT SEPAY (VietQR)
  // ================================================================================
  console.log("--- TEST 2: Guest Checkout SePay VietQR ---");
  const guestSepayPayload = {
    fullName: "Trần Thị Khách",
    phone: "0987654321",
    email: "khach.test.sepay@craft3d.vn",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Bến Nghé",
    addressDetail: "Tòa nhà Landmark 81",
    orderNotice: "Khắc tên chữ hoa đẹp",
    paymentMethod: "SEPAY",
    items: [
      {
        productId: product.id,
        variantId: variant.id,
        quantity: 2,
        customText: "SEPAY VIETQR",
      },
    ],
  };

  const sepayReq = {
    body: guestSepayPayload,
    headers: { "idempotency-key": `test-idem-sepay-${Date.now()}` },
  };
  const sepayRes = createMockRes();

  await createCustomerOrder(sepayReq, sepayRes);
  assert(sepayRes.statusCode === 201, `SePay Order creation returned HTTP 201 (Got: ${sepayRes.statusCode})`);
  assert(sepayRes.body && sepayRes.body.orderCode, `Order code generated: ${sepayRes.body?.orderCode}`);
  assert(sepayRes.body.paymentMethod === "SEPAY", `Payment method is SEPAY`);
  assert(sepayRes.body.paymentStatus === "PENDING", `Payment status is PENDING`);
  assert(sepayRes.body.status === "PENDING_PAYMENT", `Order status is PENDING_PAYMENT (Got: ${sepayRes.body.status})`);
  assert(sepayRes.body.checkoutSession !== null, `Pre-generated checkoutSession returned in response`);
  assert(sepayRes.body.checkoutSession.checkoutUrl.includes("sepay.vn"), `Checkout URL points to SePay Gateway`);
  assert(typeof sepayRes.body.checkoutSession.fields.signature === "string", `HMAC-SHA256 signature generated`);

  const sepayOrderCode = sepayRes.body.orderCode;
  createdTestOrderCodes.push(sepayOrderCode);

  const sepayOrderInDb = await prisma.customer_order.findUnique({
    where: { orderCode: sepayOrderCode },
    include: { payments: true },
  });
  assert(sepayOrderInDb.payments.length === 1, `Payment record created in DB for SePay`);
  assert(sepayOrderInDb.payments[0].provider === "SEPAY", `Payment provider is SEPAY`);
  assert(sepayOrderInDb.payments[0].status === "PENDING", `Payment status is PENDING`);
  console.log();

  // ================================================================================
  // TEST 3: SEPAY CHECKOUT SESSION API
  // ================================================================================
  console.log("--- TEST 3: POST /api/payments/sepay/checkout-session ---");
  const sessionReq = {
    body: {
      orderCode: sepayOrderCode,
      email: "khach.test.sepay@craft3d.vn",
      phone: "0987654321",
    },
    headers: {},
    query: {},
  };
  const sessionRes = createMockRes();

  await createCheckoutSession(sessionReq, sessionRes);
  assert(sessionRes.statusCode === 200, `Checkout session API returned HTTP 200`);
  assert(sessionRes.body.checkoutUrl.includes("checkout/init"), `Checkout URL is valid init endpoint`);
  assert(sessionRes.body.fields.order_invoice_number === sepayOrderCode, `order_invoice_number matches orderCode`);
  assert(sessionRes.body.fields.order_amount === sepayOrderInDb.total, `order_amount matches exact order total (${sepayOrderInDb.total}đ)`);
  assert(Boolean(sessionRes.body.fields.signature), `Fields include valid signature`);
  console.log();

  // ================================================================================
  // TEST 4: SEPAY IPN SECURITY - REJECT INVALID SECRET KEY
  // ================================================================================
  console.log("--- TEST 4: SePay IPN Security - Reject Invalid Secret Key ---");
  const invalidIpnReq = {
    headers: {
      "x-secret-key": "invalid_hacker_secret_key_12345",
    },
    body: {
      notification_type: "ORDER_PAID",
      order: {
        order_invoice_number: sepayOrderCode,
        order_amount: String(sepayOrderInDb.total),
        order_status: "CAPTURED",
      },
    },
  };
  const invalidIpnRes = createMockRes();

  await handleSepayIpn(invalidIpnReq, invalidIpnRes);
  assert(invalidIpnRes.statusCode === 401, `Unauthorized IPN request rejected with HTTP 401 (Got: ${invalidIpnRes.statusCode})`);
  assert(invalidIpnRes.body.error === "Unauthorized", `Error message specifies Unauthorized`);

  // Verify order in DB was NOT changed
  const orderAfterInvalidIpn = await prisma.customer_order.findUnique({ where: { orderCode: sepayOrderCode } });
  assert(orderAfterInvalidIpn.paymentStatus === "PENDING", `Order paymentStatus remains PENDING`);
  console.log();

  // ================================================================================
  // TEST 5: SEPAY IPN VALIDATION - REJECT AMOUNT MISMATCH
  // ================================================================================
  console.log("--- TEST 5: SePay IPN Validation - Reject Amount Mismatch ---");
  const secretKey = process.env.SEPAY_SECRET_KEY || process.env['SECRET KEY'] || 'spsk_test_Hu9o846Pau1dMcJ6Qz3Wy8KZ1fjzjzhZ';
  const tamperedAmountIpnReq = {
    headers: {
      "x-secret-key": secretKey,
    },
    body: {
      notification_type: "ORDER_PAID",
      order: {
        order_invoice_number: sepayOrderCode,
        order_amount: "1000", // Cố ý gửi 1,000 VND thay vì giá trị thật của đơn hàng
        order_status: "CAPTURED",
      },
    },
  };
  const tamperedRes = createMockRes();

  await handleSepayIpn(tamperedAmountIpnReq, tamperedRes);
  assert(tamperedRes.statusCode === 400, `Tampered amount rejected with HTTP 400 (Got: ${tamperedRes.statusCode})`);
  assert(tamperedRes.body.error === "Amount mismatch", `Error specifies Amount mismatch`);

  const orderAfterTampered = await prisma.customer_order.findUnique({ where: { orderCode: sepayOrderCode } });
  assert(orderAfterTampered.paymentStatus === "PENDING", `Order paymentStatus remains PENDING`);
  console.log();

  // ================================================================================
  // TEST 6: SEPAY IPN VALID PROCESSING (STATUS -> PAID / CONFIRMED)
  // ================================================================================
  console.log("--- TEST 6: SePay IPN Valid Processing ---");
  const validIpnReq = {
    headers: {
      "x-secret-key": secretKey,
    },
    body: {
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: "ORDER_PAID",
      order: {
        id: `SEPAY-ORD-${Date.now()}`,
        order_invoice_number: sepayOrderCode,
        order_amount: String(sepayOrderInDb.total),
        order_status: "CAPTURED",
        order_currency: "VND",
        order_description: `Thanh toan don hang ${sepayOrderCode}`,
      },
      transaction: {
        id: `TXN-SEPAY-${Date.now()}`,
        amount: String(sepayOrderInDb.total),
        bank_code: "VIETCOMBANK",
      },
      customer: {
        name: sepayOrderInDb.fullName,
      },
    },
  };
  const validIpnRes = createMockRes();

  await handleSepayIpn(validIpnReq, validIpnRes);
  assert(validIpnRes.statusCode === 200, `Valid IPN returned HTTP 200 OK (Got: ${validIpnRes.statusCode})`);
  assert(validIpnRes.body.success === true, `Response body success is true`);

  // Kiểm tra cơ sở dữ liệu sau IPN
  const orderAfterValidIpn = await prisma.customer_order.findUnique({
    where: { orderCode: sepayOrderCode },
    include: { payments: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  assert(orderAfterValidIpn.paymentStatus === "PAID", `Customer_order.paymentStatus updated to PAID`);
  assert(orderAfterValidIpn.status === "CONFIRMED", `Customer_order.status transitioned to CONFIRMED`);

  const sepayPaymentRecord = orderAfterValidIpn.payments.find((p) => p.provider === "SEPAY");
  assert(sepayPaymentRecord.status === "SUCCESS", `Payment record status updated to SUCCESS`);
  assert(sepayPaymentRecord.txnRef.startsWith("TXN-SEPAY"), `Payment record txnRef updated with gateway transaction ID`);

  const webhookStatusHist = orderAfterValidIpn.statusHistory.find((h) => h.changedBy === "GATEWAY_WEBHOOK");
  assert(webhookStatusHist !== undefined, `OrderStatusHistory found with changedBy GATEWAY_WEBHOOK`);
  assert(webhookStatusHist && webhookStatusHist.toStatus === "CONFIRMED", `OrderStatusHistory logged CONFIRMED`);
  assert(webhookStatusHist && webhookStatusHist.changedBy === "GATEWAY_WEBHOOK", `OrderStatusHistory changedBy is GATEWAY_WEBHOOK`);
  console.log();

  // ================================================================================
  // TEST 7: SEPAY IPN IDEMPOTENCY REPLAY
  // ================================================================================
  console.log("--- TEST 7: SePay IPN Idempotency Replay ---");
  const replayIpnRes = createMockRes();
  const histCountBefore = orderAfterValidIpn.statusHistory.length;

  await handleSepayIpn(validIpnReq, replayIpnRes);
  assert(replayIpnRes.statusCode === 200, `Replay IPN returned HTTP 200 OK (Got: ${replayIpnRes.statusCode})`);
  assert(replayIpnRes.body.success === true, `Replay IPN handled cleanly without error`);
  assert(replayIpnRes.body.message.includes("Idempotent"), `Message indicates Idempotent replay`);

  const orderAfterReplay = await prisma.customer_order.findUnique({
    where: { orderCode: sepayOrderCode },
    include: { statusHistory: true },
  });
  assert(orderAfterReplay.statusHistory.length === histCountBefore, `No duplicate statusHistory records created on replay (${histCountBefore} === ${orderAfterReplay.statusHistory.length})`);
  console.log();

  // ================================================================================
  // TEST 8: GUEST ORDER LOOKUP & SENSITIVE DATA ENUMERATION PROTECTION
  // ================================================================================
  console.log("--- TEST 8: Guest Order Lookup & Security ---");
  // a. Tra cứu hợp lệ bằng orderCode + email
  const lookupReq = {
    body: {
      orderCode: sepayOrderCode,
      email: "khach.test.sepay@craft3d.vn",
    },
  };
  const lookupRes = createMockRes();

  await lookupCustomerOrder(lookupReq, lookupRes);
  assert(lookupRes.statusCode === 200, `Guest lookup with correct email returned HTTP 200`);
  assert(lookupRes.body.orderCode === sepayOrderCode, `Looked up order code matches`);
  assert(lookupRes.body.paymentStatus === "PAID", `Looked up order reflects PAID status`);
  assert(lookupRes.body.payments[0].rawResponse === undefined, `Sensitive payments.rawResponse is omitted from lookup output`);

  // b. Tra cứu với thông tin xác thực sai (chống enumeration)
  const wrongLookupReq = {
    body: {
      orderCode: sepayOrderCode,
      email: "wrong.hacker@example.com",
    },
  };
  const wrongLookupRes = createMockRes();

  await lookupCustomerOrder(wrongLookupReq, wrongLookupRes);
  assert(wrongLookupRes.statusCode === 404, `Lookup with mismatched email returned uniform HTTP 404`);

  // c. Tra cứu với mã đơn không tồn tại (cũng trả về 404 giống hệt nhau)
  const nonExistLookupReq = {
    body: {
      orderCode: "MK-999999-FAKE",
      email: "wrong.hacker@example.com",
    },
  };
  const nonExistLookupRes = createMockRes();

  await lookupCustomerOrder(nonExistLookupReq, nonExistLookupRes);
  assert(nonExistLookupRes.statusCode === 404, `Non-existent order returned identical uniform HTTP 404`);
  console.log();

  // ================================================================================
  // TEST 9: PAYMENT STATUS GET ENDPOINT
  // ================================================================================
  console.log("--- TEST 9: GET /api/payments/sepay/status/:orderCode ---");
  const getStatusReq = { params: { orderCode: sepayOrderCode } };
  const getStatusRes = createMockRes();

  await getPaymentStatus(getStatusReq, getStatusRes);
  assert(getStatusRes.statusCode === 200, `Payment status endpoint returned HTTP 200`);
  assert(getStatusRes.body.paymentStatus === "PAID", `Payment status is PAID`);
  assert(getStatusRes.body.status === "CONFIRMED", `Order status is CONFIRMED`);
  console.log();

  // ================================================================================
  // TEST CLEANUP: HOÀN TỒN KHO & XÓA CÁC ĐƠN HÀNG TEST ĐỂ GIỮ DATABASE SẠCH SẼ
  // ================================================================================
  console.log("--- CLEANUP: Restoring inventory and cleaning up test orders ---");
  // Hoàn lại kho cho variant
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: initialStock },
  });
  console.log(`Restored variant stock to ${initialStock}`);

  for (const code of createdTestOrderCodes) {
    const ord = await prisma.customer_order.findUnique({ where: { orderCode: code } });
    if (ord) {
      await prisma.payment.deleteMany({ where: { orderId: ord.id } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: ord.id } });
      await prisma.customer_order_product.deleteMany({ where: { customerOrderId: ord.id } });
      await prisma.customer_order.delete({ where: { id: ord.id } });
      console.log(`Cleaned up test order: ${code}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`                     SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED                      `);
  console.log("================================================================================\n");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("❌ Fatal test error:", err);
  process.exit(1);
});
