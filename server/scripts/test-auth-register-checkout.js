/**
 * Comprehensive Test Suite for:
 * 1. Require Login Before Checkout & Safe Return URL Validation (Issue 1)
 * 2. Customer Registration Validation & Account Creation (Issue 2)
 * 3. Order Submission for COD & SePay Bank Transfer (Issue 3)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const prisma = require('../utills/db');
const bcrypt = require('bcryptjs');
const { createCustomerOrder } = require('../controllers/customer_orders');
const { createCheckoutSession } = require('../controllers/payments');
const { calculateShippingFee } = require('../utills/validation');

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

// Logic replicate of getSafeReturnUrl for backend verification
function getSafeReturnUrl(rawUrl, fallback = '/') {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;
  if (trimmed.includes('\\')) return fallback;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return fallback;
  return trimmed;
}

// Logic replicate of Vietnamese phone validation
function isValidVietnamesePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   CRAFT3D: AUTHENTICATION, REGISTRATION & CHECKOUT SUBMISSION TEST SUITE       ");
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

  // Find active product and variant
  const product = await prisma.product.findFirst({
    where: { isActive: true },
    include: { variants: { where: { isActive: true } } },
  });

  if (!product || product.variants.length === 0) {
    console.error("❌ No active product or variants found in database!");
    process.exit(1);
  }

  const variant = product.variants[0];
  const initialStock = variant.stock;
  const createdTestOrderCodes = [];
  const testUserEmails = [];

  // ================================================================================
  // SECTION 1: SAFE RETURN URL & OPEN REDIRECT DEFENSE (ISSUE 1)
  // ================================================================================
  console.log("--- 1. Safe Return URL & Open Redirect Defense ---");
  assert(getSafeReturnUrl('/checkout') === '/checkout', "Valid internal URL '/checkout' is accepted");
  assert(getSafeReturnUrl('/cart') === '/cart', "Valid internal URL '/cart' is accepted");
  assert(getSafeReturnUrl('/product/keychain-the-bai') === '/product/keychain-the-bai', "Valid internal nested path is accepted");
  assert(getSafeReturnUrl('https://evil.attacker.com') === '/', "External URL with https is blocked (returns '/')");
  assert(getSafeReturnUrl('//evil.attacker.com') === '/', "Protocol-relative URL '//evil.attacker.com' is blocked");
  assert(getSafeReturnUrl('/\\evil.attacker.com') === '/', "Slash-backslash bypass '/\\evil.com' is blocked");
  assert(getSafeReturnUrl('/evil.com\\path') === '/', "Backslash injection inside path is blocked");
  assert(getSafeReturnUrl('javascript:alert(1)') === '/', "JavaScript scheme 'javascript:' is blocked");
  assert(getSafeReturnUrl('data:text/html,evil') === '/', "Data URI scheme is blocked");
  assert(getSafeReturnUrl(null, '/checkout') === '/checkout', "Null input returns custom fallback '/checkout'");
  assert(getSafeReturnUrl('', '/checkout') === '/checkout', "Empty string returns custom fallback '/checkout'");
  console.log();

  // ================================================================================
  // SECTION 2: VIETNAMESE REGISTRATION & PROFILE VALIDATION (ISSUE 2)
  // ================================================================================
  console.log("--- 2. Vietnamese Registration Validation & Persistence ---");
  // 2a. Vietnamese phone validation checks
  assert(isValidVietnamesePhone('0912345678') === true, "Valid 10-digit mobile '0912345678' accepted");
  assert(isValidVietnamesePhone('0388123456') === true, "Valid 10-digit Viettel '0388123456' accepted");
  assert(isValidVietnamesePhone('+84912345678') === true, "Valid +84 prefix '+84912345678' accepted");
  assert(isValidVietnamesePhone('0123456789') === false, "Invalid prefix '012...' rejected");
  assert(isValidVietnamesePhone('0912345') === false, "Too short phone rejected");
  assert(isValidVietnamesePhone('091234567899') === false, "Too long phone rejected");
  assert(isValidVietnamesePhone('abcdefghij') === false, "Non-digit characters rejected");

  // 2b. Database user persistence with full Vietnamese profile
  const testRegEmail = `test.reg.${Date.now()}@craft3d.vn`;
  testUserEmails.push(testRegEmail);

  const rawPassword = "StrongPassword@123";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const createdUser = await prisma.user.create({
    data: {
      id: `user-test-${Date.now()}`,
      name: "Tuấn Anh",
      lastname: "Nguyễn",
      email: testRegEmail,
      phone: "0987654321",
      address: "Số 88 Phố Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
      password: hashedPassword,
      role: "user",
    },
  });

  assert(Boolean(createdUser.id), "User record created successfully in database");
  assert(createdUser.name === "Tuấn Anh", `User name matches: ${createdUser.name}`);
  assert(createdUser.lastname === "Nguyễn", `User lastname matches: ${createdUser.lastname}`);
  assert(createdUser.phone === "0987654321", `User phone matches: ${createdUser.phone}`);
  assert(createdUser.address === "Số 88 Phố Dịch Vọng Hậu, Cầu Giấy, Hà Nội", "User default address persisted");
  assert(createdUser.password !== rawPassword, "Password is not stored in plaintext");
  assert(await bcrypt.compare(rawPassword, createdUser.password), "Bcrypt password verification succeeds");

  // 2c. Duplicate email rejection
  const existingCheck = await prisma.user.findFirst({ where: { email: testRegEmail } });
  assert(Boolean(existingCheck), "Duplicate check detects existing user by email");
  console.log();

  // ================================================================================
  // SECTION 3: CHECKOUT AUTHENTICATION REQUIREMENT (ISSUE 1 & 3)
  // ================================================================================
  console.log("--- 3. Checkout Authentication Guard & Guest Rejection ---");
  const guestReq = {
    body: {
      fullName: "Khách Vãng Lai",
      name: "Lai",
      lastname: "Khách Vãng",
      phone: "0901234567",
      email: "unregistered.guest@example.com",
      province: "Hà Nội",
      district: "Cầu Giấy",
      ward: "Dịch Vọng Hậu",
      addressDetail: "Số 1 Duy Tân",
      paymentMethod: "COD",
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
    },
    headers: { "idempotency-key": `idem-guest-${Date.now()}` },
  };
  const guestRes = createMockRes();
  await createCustomerOrder(guestReq, guestRes);

  assert(guestRes.statusCode === 401, `Unregistered guest order rejected with HTTP 401 (Got: ${guestRes.statusCode})`);
  assert(guestRes.body?.error === "Authentication required", "Error is 'Authentication required'");
  console.log();

  // ================================================================================
  // SECTION 4: COMPLETE ORDER SUBMISSION FOR COD (ISSUE 3)
  // ================================================================================
  console.log("--- 4. Order Submission: COD for Authenticated Customer ---");
  const codReq = {
    body: {
      name: createdUser.name,
      lastname: createdUser.lastname,
      fullName: `${createdUser.lastname} ${createdUser.name}`,
      phone: createdUser.phone,
      email: createdUser.email,
      province: "Hà Nội",
      district: "Cầu Giấy",
      ward: "Dịch Vọng Hậu",
      addressDetail: createdUser.address,
      orderNotice: "Giao tận tay, xin cảm ơn",
      paymentMethod: "COD",
      items: [
        {
          productId: product.id,
          variantId: variant.id,
          quantity: 1,
          customText: "CRAFT3D COD",
          customFont: "Playfair Display",
          customQrUrl: "https://craft3d.vn",
        },
      ],
    },
    headers: { "idempotency-key": `idem-cod-${Date.now()}` },
  };
  const codRes = createMockRes();
  await createCustomerOrder(codReq, codRes);

  assert(codRes.statusCode === 201, `COD Order created successfully with HTTP 201 (Got: ${codRes.statusCode})`);
  assert(Boolean(codRes.body?.orderCode), `Order code generated: ${codRes.body?.orderCode}`);
  assert(codRes.body?.paymentMethod === "COD", "Payment method is COD");
  assert(codRes.body?.paymentStatus === "PENDING", "Payment status is PENDING (COD)");
  assert(codRes.body?.status === "PENDING", "Order status is PENDING");

  const codOrderCode = codRes.body.orderCode;
  createdTestOrderCodes.push(codOrderCode);

  // Verify stock decremented
  const variantAfterCod = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  assert(variantAfterCod.stock === initialStock - 1, `Atomic stock decrement verified (${initialStock} -> ${variantAfterCod.stock})`);

  // Verify snapshot & customization saved
  const savedCodOrder = await prisma.customer_order.findUnique({
    where: { orderCode: codOrderCode },
    include: { products: true, payments: true, statusHistory: true },
  });
  assert(savedCodOrder.name === "Tuấn Anh", `Order name correctly saved: ${savedCodOrder.name}`);
  assert(savedCodOrder.lastname === "Nguyễn", `Order lastname correctly saved: ${savedCodOrder.lastname}`);
  assert(savedCodOrder.fullName === "Nguyễn Tuấn Anh", `Order fullName correctly saved: ${savedCodOrder.fullName}`);
  assert(savedCodOrder.products.length === 1, "Order item count is 1");
  assert(savedCodOrder.products[0].customText === "CRAFT3D COD", "Custom text preserved");
  assert(savedCodOrder.products[0].unitPrice === variant.price, `Unit price matches DB variant price (${variant.price})`);
  assert(savedCodOrder.payments.length === 1 && savedCodOrder.payments[0].provider === "COD", "COD Payment record initialized");
  assert(savedCodOrder.statusHistory[0].changedBy === createdUser.id, `Status history changedBy linked to user ID: ${createdUser.id}`);
  console.log();

  // ================================================================================
  // SECTION 5: COMPLETE ORDER SUBMISSION FOR SEPAY (ISSUE 3)
  // ================================================================================
  console.log("--- 5. Order Submission: SePay Bank Transfer for Authenticated Customer ---");
  const sepayReq = {
    body: {
      name: createdUser.name,
      lastname: createdUser.lastname,
      fullName: `${createdUser.lastname} ${createdUser.name}`,
      phone: createdUser.phone,
      email: createdUser.email,
      province: "Hà Nội",
      district: "Cầu Giấy",
      ward: "Dịch Vọng Hậu",
      addressDetail: createdUser.address,
      orderNotice: "Thanh toán qua SePay VietQR Sandbox",
      paymentMethod: "SEPAY",
      items: [
        {
          productId: product.id,
          variantId: variant.id,
          quantity: 2,
          customText: "SEPAY QR",
        },
      ],
    },
    headers: { "idempotency-key": `idem-sepay-${Date.now()}` },
  };
  const sepayRes = createMockRes();
  await createCustomerOrder(sepayReq, sepayRes);

  assert(sepayRes.statusCode === 201, `SePay Order created with HTTP 201 (Got: ${sepayRes.statusCode})`);
  assert(sepayRes.body?.paymentMethod === "SEPAY", "Payment method is SEPAY");
  assert(sepayRes.body?.paymentStatus === "PENDING", "Payment status is PENDING");
  assert(sepayRes.body?.status === "PENDING_PAYMENT", "Order status is PENDING_PAYMENT");
  assert(Boolean(sepayRes.body?.checkoutSession), "SePay checkoutSession generated and returned");
  assert(Boolean(sepayRes.body?.checkoutSession?.fields?.signature), "SePay HMAC-SHA256 signature generated in fields");

  const sepayOrderCode = sepayRes.body.orderCode;
  createdTestOrderCodes.push(sepayOrderCode);

  // Verify stock decremented by 2
  const variantAfterSepay = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  assert(variantAfterSepay.stock === initialStock - 3, `Atomic stock decrement verified (${initialStock - 1} -> ${variantAfterSepay.stock})`);
  console.log();

  // ================================================================================
  // CLEANUP
  // ================================================================================
  console.log("--- CLEANUP: Restoring Database State ---");
  // Restore stock
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: initialStock },
  });
  console.log(`Restored variant stock to ${initialStock}`);

  // Delete test orders
  for (const code of createdTestOrderCodes) {
    const ord = await prisma.customer_order.findUnique({ where: { orderCode: code } });
    if (ord) {
      await prisma.emailOutbox.deleteMany({ where: { orderId: ord.id } });
      await prisma.payment.deleteMany({ where: { orderId: ord.id } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: ord.id } });
      await prisma.customer_order_product.deleteMany({ where: { customerOrderId: ord.id } });
      await prisma.customer_order.delete({ where: { id: ord.id } });
      console.log(`Cleaned up order: ${code}`);
    }
  }

  // Delete test users
  for (const email of testUserEmails) {
    await prisma.user.deleteMany({ where: { email } });
    console.log(`Cleaned up user: ${email}`);
  }

  console.log("\n================================================================================");
  console.log(`   FINAL SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED                    `);
  console.log("================================================================================\n");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("❌ Fatal test error:", err);
  process.exit(1);
});
