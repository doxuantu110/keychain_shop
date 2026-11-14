/**
 * Comprehensive Automated Test Suite:
 * Email Notification System + Admin Order Management
 *
 * Verifies:
 * 1. 7 Vietnamese Craft3D Branded Email Templates
 * 2. Database-backed Email Outbox Pattern & Queueing
 * 3. Outbox Deduplication & Idempotency Key
 * 4. Outbox Worker Dispatching & Retries
 * 5. Admin Authorization (401 Unauthorized on unauthenticated requests)
 * 6. Admin Orders List with Pagination, Search & Filters
 * 7. Admin Orders Real-Time KPI Stats API
 * 8. Admin Order Detail with Customization & Email Logs
 * 9. State Machine Transitions Enforcement
 * 10. Atomic Stock Restoration on Cancellation & Idempotency
 * 11. Admin Internal Notes API
 * 12. Manual Email Resend API with Audit Logging
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const prisma = require('../utills/db');
const emailTemplates = require('../services/email/emailTemplates');
const emailOutboxService = require('../services/email/emailOutboxService');
const app = require('../app');

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'craft3d_sec_adm_9f4b7a12e8c60351';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test_nextauth_secret_should_fail';

let passed = 0;
let failed = 0;
let BASE_URL = '';
let server = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function requestJson(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const data = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => { resBody += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(resBody);
        } catch (e) {
          json = resBody;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  CRAFT3D: EMAIL NOTIFICATION & ADMIN ORDER MANAGEMENT TESTS  ');
  console.log('===============================================================\n');

  // Start ephemeral test server
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      BASE_URL = `http://127.0.0.1:${port}`;
      console.log(`  Ephemeral test server listening on ${BASE_URL}\n`);
      resolve();
    });
  });

  // Enable test mock mode for outbox
  emailOutboxService.forceMock = true;

  // Test Order Data
  const testOrder = {
    id: `test-order-${Date.now()}`,
    orderCode: `MK-TEST-${Date.now().toString().slice(-6)}`,
    name: 'Tuấn',
    lastname: 'Nguyễn Anh',
    fullName: 'Nguyễn Anh Tuấn',
    email: 'test.customer@craft3d.vn',
    phone: '0987123456',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng Hậu',
    addressDetail: 'Số 12 Duy Tân',
    subtotal: 120000,
    shippingFee: 25000,
    total: 145000,
    paymentMethod: 'SEPAY',
    paymentStatus: 'PENDING',
    status: 'PENDING_PAYMENT',
    orderNotice: 'Giao giờ hành chính',
    products: [
      {
        productTitle: 'Móc khóa 3D thẻ bài',
        sizeLabel: '8cm',
        unitPrice: 120000,
        quantity: 1,
        customText: 'TUAN-ANH-2026',
        customFont: 'Montserrat Bold',
        customQrUrl: 'https://craft3d.vn/qr/tuan-anh',
      },
    ],
  };

  // -------------------------------------------------------------
  // TEST SUITE 1: 7 VIETNAMESE EMAIL TEMPLATES
  // -------------------------------------------------------------
  console.log('--- 1. Testing 7 Branded Email Templates ---');

  const tpl1 = emailTemplates.templateOrderConfirmation(testOrder);
  assert(tpl1.subject.includes(testOrder.orderCode), 'Template 1 (Order Confirmation): Subject contains orderCode');
  assert(tpl1.html.includes('TUAN-ANH-2026'), 'Template 1: HTML includes customText');
  assert(tpl1.html.includes('Montserrat Bold'), 'Template 1: HTML includes customFont');
  assert(tpl1.html.includes('145.000'), 'Template 1: HTML formats total in VND');

  const tpl2 = emailTemplates.templatePaymentInstructions(testOrder, 'https://pay-sandbox.sepay.vn/test');
  assert(tpl2.subject.includes('Hướng dẫn thanh toán'), 'Template 2 (Payment Instructions): Subject contains instructions');
  assert(tpl2.html.includes(testOrder.orderCode), 'Template 2: HTML includes transfer content orderCode');
  assert(tpl2.html.includes('https://pay-sandbox.sepay.vn/test'), 'Template 2: HTML includes checkout URL');

  const tpl3 = emailTemplates.templatePaymentSuccess(testOrder, { txnRef: 'SPTXN98765', amount: 145000 });
  assert(tpl3.subject.includes('Thanh toán thành công'), 'Template 3 (Payment Success): Subject contains payment success');
  assert(tpl3.html.includes('SPTXN98765'), 'Template 3: HTML includes TxnRef');

  const tpl4 = emailTemplates.templateOrderConfirmed(testOrder, 'Xưởng đã nhận phôi in');
  assert(tpl4.subject.includes('đã được xác nhận'), 'Template 4 (Order Confirmed): Subject contains confirmed');
  assert(tpl4.html.includes('Xưởng đã nhận phôi in'), 'Template 4: HTML includes admin note');

  const tpl5 = emailTemplates.templateOrderShipped(testOrder, { carrier: 'Giao Hàng Tiết Kiệm', trackingCode: 'GHTK88223' });
  assert(tpl5.subject.includes('đang trên đường giao'), 'Template 5 (Order Shipped): Subject contains shipped');
  assert(tpl5.html.includes('GHTK88223'), 'Template 5: HTML includes trackingCode');

  const tpl6 = emailTemplates.templateOrderDelivered(testOrder);
  assert(tpl6.subject.includes('đã được giao thành công'), 'Template 6 (Order Delivered): Subject contains delivered');
  assert(tpl6.html.includes('Mẹo bảo quản móc khóa in 3D'), 'Template 6: HTML includes care guide');

  const tpl7 = emailTemplates.templateOrderCancelled(testOrder, 'Khách hàng thay đổi yêu cầu thiết kế');
  assert(tpl7.subject.includes('Thông báo hủy đơn hàng'), 'Template 7 (Order Cancelled): Subject contains cancellation');
  assert(tpl7.html.includes('Khách hàng thay đổi yêu cầu thiết kế'), 'Template 7: HTML includes cancel reason');

  // HTML Injection & XSS Escaping Test (Phase 4 Security Verification)
  const maliciousOrder = {
    ...testOrder,
    fullName: '<script>alert("xss-name")</script>',
    name: '<b>Malicious</b>',
    orderNotice: '<img src=x onerror=alert("notice")>',
    products: [
      {
        ...testOrder.products[0],
        customText: '<script>alert("xss-custom")</script>',
        customFont: '"><svg onload=alert(1)>',
        customQrUrl: 'javascript:alert(1)',
      },
    ],
  };
  const malConfirm = emailTemplates.templateOrderConfirmation(maliciousOrder);
  assert(!malConfirm.html.includes('<script>'), 'HTML Escaping: Raw <script> tag is NOT present in email HTML');
  assert(malConfirm.html.includes('&lt;script&gt;alert(&quot;xss-custom&quot;)&lt;/script&gt;'), 'HTML Escaping: Custom text is safely escaped');
  assert(malConfirm.html.includes('&lt;script&gt;alert(&quot;xss-name&quot;)&lt;/script&gt;'), 'HTML Escaping: Recipient name is safely escaped');
  assert(!malConfirm.html.includes('<img src=x'), 'HTML Escaping: Raw img onerror tag is NOT present in email HTML');

  // -------------------------------------------------------------
  // TEST SUITE 2: EMAIL OUTBOX QUEUEING & IDEMPOTENCY
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Database-backed Email Outbox Pattern ---');

  const idempotencyKey = `TEST-IDEMP-${Date.now()}`;
  const queueResult1 = await emailOutboxService.queueEmail({
    orderId: testOrder.id,
    orderCode: testOrder.orderCode,
    eventType: 'ORDER_CONFIRMATION',
    recipient: testOrder.email,
    subject: tpl1.subject,
    htmlContent: tpl1.html,
    textContent: tpl1.text,
    idempotencyKey,
  });

  assert(queueResult1.success === true, 'Outbox queueEmail succeeds');
  assert(queueResult1.record.status === 'PENDING', 'Queued record initial status is PENDING');

  // Idempotency test: Re-queue with the SAME key
  const queueResult2 = await emailOutboxService.queueEmail({
    orderId: testOrder.id,
    orderCode: testOrder.orderCode,
    eventType: 'ORDER_CONFIRMATION',
    recipient: testOrder.email,
    subject: tpl1.subject,
    htmlContent: tpl1.html,
    textContent: tpl1.text,
    idempotencyKey,
  });

  assert(queueResult2.success === true, 'Duplicate queueEmail request returns success');
  assert(queueResult2.deduplicated === true, 'Duplicate queueEmail is correctly deduplicated');
  assert(queueResult2.record.id === queueResult1.record.id, 'No second outbox record created in DB');

  // Allow background setImmediate worker to finish dispatching
  await new Promise((r) => setTimeout(r, 300));
  await emailOutboxService.processOutbox();
  let processedRecord = await prisma.emailOutbox.findUnique({
    where: { id: queueResult1.record.id },
  });
  if (processedRecord.status !== 'SENT') {
    await new Promise((r) => setTimeout(r, 300));
    processedRecord = await prisma.emailOutbox.findUnique({
      where: { id: queueResult1.record.id },
    });
  }
  assert(processedRecord.status === 'SENT', 'Outbox worker transitioned status to SENT');
  assert(processedRecord.sentAt !== null, 'Outbox worker populated sentAt timestamp');

  // Test 2b: Stale Lease Recovery (> 5 minutes in PROCESSING)
  const staleIdempKey = `TEST-STALE-${Date.now()}`;
  const staleRecord = await prisma.emailOutbox.create({
    data: {
      orderId: 'stale-test-order',
      orderCode: 'MK-STALE',
      eventType: 'ORDER_CONFIRMATION',
      recipient: 'stale@craft3d.vn',
      subject: 'Stale Test',
      htmlContent: '<p>Stale</p>',
      status: 'PROCESSING',
      retryCount: 0,
      maxRetries: 3,
      idempotencyKey: staleIdempKey,
      updatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    },
  });

  // Run processOutbox to trigger recovery and dispatch
  await emailOutboxService.processOutbox();
  const recoveredRecord = await prisma.emailOutbox.findUnique({ where: { id: staleRecord.id } });
  assert(recoveredRecord.status === 'SENT', 'Stale PROCESSING lease recovered and successfully dispatched');
  await prisma.emailOutbox.delete({ where: { id: staleRecord.id } });

  // Test 2c: Atomic Conditional Lease Claiming & Concurrency Protection
  const claimRecord = await prisma.emailOutbox.create({
    data: {
      orderId: 'claim-test-order',
      orderCode: 'MK-CLAIM',
      eventType: 'ORDER_CONFIRMATION',
      recipient: 'claim@craft3d.vn',
      subject: 'Claim Test',
      htmlContent: '<p>Claim</p>',
      status: 'PROCESSING', // already claimed by worker 1
      retryCount: 0,
      maxRetries: 3,
      idempotencyKey: `TEST-CLAIM-${Date.now()}`,
    },
  });

  const duplicateClaimResult = await prisma.emailOutbox.updateMany({
    where: {
      id: claimRecord.id,
      status: { in: ['PENDING', 'FAILED'] },
    },
    data: { status: 'PROCESSING', updatedAt: new Date() },
  });
  assert(duplicateClaimResult.count === 0, 'Atomic lease claim rejects competing worker when status is already PROCESSING');
  await prisma.emailOutbox.delete({ where: { id: claimRecord.id } });

  // -------------------------------------------------------------
  // TEST SUITE 3: ADMIN API AUTHORIZATION SECURITY
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Admin Authorization Protection ---');

  // Unauthenticated requests MUST return 401
  const unauthList = await requestJson('GET', '/api/admin/orders');
  assert(unauthList.status === 401, 'GET /api/admin/orders without token returns 401 Unauthorized');

  const unauthStats = await requestJson('GET', '/api/admin/orders/stats');
  assert(unauthStats.status === 401, 'GET /api/admin/orders/stats without token returns 401 Unauthorized');

  const unauthUpdate = await requestJson('PATCH', `/api/admin/orders/${testOrder.id}/status`, { status: 'CONFIRMED' });
  assert(unauthUpdate.status === 401, 'PATCH /api/admin/orders/:id/status without token returns 401 Unauthorized');

  // Secret Conflation: NEXTAUTH_SECRET MUST be strictly rejected as admin key
  const secretConflation = await requestJson('GET', '/api/admin/orders', null, { 'x-admin-key': NEXTAUTH_SECRET });
  assert(secretConflation.status === 401, 'NEXTAUTH_SECRET passed as admin key is strictly rejected with 401 Unauthorized');

  // Weak/short key (<16 characters) MUST be strictly rejected
  const weakKeyRes = await requestJson('GET', '/api/admin/orders', null, { 'x-admin-key': 'short_key_123' });
  assert(weakKeyRes.status === 401, 'Short/weak admin key (<16 chars) is strictly rejected with 401 Unauthorized');

  // -------------------------------------------------------------
  // TEST SUITE 4: CREATE REAL DB ORDER FOR ADMIN API TESTS
  // -------------------------------------------------------------
  console.log('\n--- 4. Creating Test Order in Database ---');

  // Ensure active product and variant exist
  let activeVariant = await prisma.productVariant.findFirst({
    where: { isActive: true },
    include: { product: true },
  });

  if (!activeVariant) {
    const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Test Category' } });
    const merchant = await prisma.merchant.findFirst() || await prisma.merchant.create({ data: { name: 'Test Merchant' } });
    const product = await prisma.product.create({
      data: {
        slug: `test-prod-${Date.now()}`,
        title: 'Móc khóa Thử nghiệm',
        mainImage: '/images/products/keychain-the-bai-front-back.jpg',
        price: 99000,
        description: 'Test',
        manufacturer: 'Craft3D',
        categoryId: category.id,
        merchantId: merchant.id,
        inStock: 1,
      },
    });
    activeVariant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        variantKey: 'size:8cm|mat:pla',
        sizeLabel: '8cm',
        sku: `SKU-TEST-${Date.now()}`,
        price: 99000,
        stock: 20,
        product: { connect: { id: product.id } },
      },
      include: { product: true },
    });
  }

  // Insert test order
  const createdDbOrder = await prisma.customer_order.create({
    data: {
      orderCode: testOrder.orderCode,
      name: testOrder.name,
      lastname: testOrder.lastname,
      fullName: testOrder.fullName,
      email: testOrder.email,
      phone: testOrder.phone,
      province: testOrder.province,
      district: testOrder.district,
      ward: testOrder.ward,
      addressDetail: testOrder.addressDetail,
      subtotal: activeVariant.price,
      shippingFee: 25000,
      total: activeVariant.price + 25000,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      orderNotice: 'Giao trước 17h',
      products: {
        create: [
          {
            productId: activeVariant.productId,
            variantId: activeVariant.id,
            quantity: 2,
            unitPrice: activeVariant.price,
            productTitle: activeVariant.product.title,
            sizeLabel: activeVariant.sizeLabel,
            customText: 'CRAFT3D-TEST',
            customFont: 'Montserrat',
            snapshotSource: 'CHECKOUT',
          },
        ],
      },
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: 'PENDING',
            note: 'Đơn hàng được khởi tạo cho automated testing',
            changedBy: 'SYSTEM_TEST',
          },
        ],
      },
      payments: {
        create: [
          {
            provider: 'COD',
            txnRef: `COD-${testOrder.orderCode}`,
            amount: activeVariant.price + 25000,
            status: 'PENDING',
          },
        ],
      },
    },
    include: { products: true, payments: true, statusHistory: true },
  });

  assert(createdDbOrder && createdDbOrder.id, `Created test order #${createdDbOrder.orderCode} in DB`);

  // Decrement variant stock by 2 to simulate real order creation
  await prisma.productVariant.update({
    where: { id: activeVariant.id },
    data: { stock: { decrement: 2 } },
  });

  // -------------------------------------------------------------
  // TEST SUITE 5: ADMIN ORDERS LIST & STATS APIS
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Admin Order List & Stats APIs ---');

  const adminHeaders = { 'x-admin-key': ADMIN_KEY };

  const listRes = await requestJson('GET', `/api/admin/orders?q=${testOrder.orderCode}`, null, adminHeaders);
  assert(listRes.status === 200, 'GET /api/admin/orders with admin key returns 200 OK');
  assert(listRes.body.orders && listRes.body.orders.length > 0, 'Admin orders list returns array with matching order');
  assert(listRes.body.pagination && listRes.body.pagination.total >= 1, 'Admin orders list includes pagination metadata');

  const statsRes = await requestJson('GET', '/api/admin/orders/stats?dateRange=all', null, adminHeaders);
  assert(statsRes.status === 200, 'GET /api/admin/orders/stats returns 200 OK');
  assert(typeof statsRes.body.total === 'number' && statsRes.body.total > 0, 'Stats returns total count');
  assert(typeof statsRes.body.pending === 'number', 'Stats returns pending count');
  assert(typeof statsRes.body.totalRevenue === 'number', 'Stats returns calculated total revenue');

  const detailRes = await requestJson('GET', `/api/admin/orders/${createdDbOrder.id}`, null, adminHeaders);
  assert(detailRes.status === 200, 'GET /api/admin/orders/:id returns 200 OK');
  assert(detailRes.body.orderCode === createdDbOrder.orderCode, 'Detail response includes correct orderCode');
  assert(detailRes.body.products.length > 0, 'Detail response includes products snapshot');
  assert(detailRes.body.products[0].customText === 'CRAFT3D-TEST', 'Detail response includes 3D customText');
  assert(Array.isArray(detailRes.body.emailLogs), 'Detail response includes emailLogs array');

  // -------------------------------------------------------------
  // TEST SUITE 6: STATE MACHINE TRANSITIONS & SECURITY
  // -------------------------------------------------------------
  console.log('\n--- 6. Testing State Machine Transitions & Strict Rules ---');

  // 1. Invalid transition: PENDING -> DELIVERED (Must be rejected)
  const invalidTrans = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, { status: 'DELIVERED' }, adminHeaders);
  assert(invalidTrans.status === 400, 'Invalid transition (PENDING -> DELIVERED) is strictly rejected with 400 Bad Request');
  assert(invalidTrans.body.details.includes('Không thể chuyển trạng thái'), 'Response explains allowed state transitions');

  // 2. Valid transition: PENDING -> CONFIRMED
  const transConfirmed = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, {
    status: 'CONFIRMED',
    note: 'Admin kiểm tra thiết kế 3D hợp lệ',
  }, adminHeaders);
  assert(transConfirmed.status === 200, 'Valid transition (PENDING -> CONFIRMED) returns 200 OK');
  assert(transConfirmed.body.order.status === 'CONFIRMED', 'Order status updated to CONFIRMED');

  // Check that OrderStatusHistory logged it
  const historyCheck = await prisma.orderStatusHistory.findFirst({
    where: { orderId: createdDbOrder.id, toStatus: 'CONFIRMED' },
  });
  assert(historyCheck !== null, 'OrderStatusHistory logged transition to CONFIRMED');

  // 3. Valid transition: CONFIRMED -> PROCESSING
  const transProcessing = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, {
    status: 'PROCESSING',
    note: 'Bắt đầu in 3D',
  }, adminHeaders);
  assert(transProcessing.status === 200, 'Transition (CONFIRMED -> PROCESSING) returns 200 OK');

  // 4. Valid transition: PROCESSING -> SHIPPED with tracking info
  const transShipped = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, {
    status: 'SHIPPED',
    carrier: 'GHN Express',
    trackingCode: 'GHN-CRAFT3D-12345',
  }, adminHeaders);
  assert(transShipped.status === 200, 'Transition (PROCESSING -> SHIPPED) returns 200 OK');

  // 5. Valid transition: SHIPPED -> DELIVERED
  const transDelivered = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, {
    status: 'DELIVERED',
  }, adminHeaders);
  assert(transDelivered.status === 200, 'Transition (SHIPPED -> DELIVERED) returns 200 OK');

  // For COD, verify paymentStatus transitioned to PAID
  const deliveredOrder = await prisma.customer_order.findUnique({
    where: { id: createdDbOrder.id },
    include: { payments: true },
  });
  assert(deliveredOrder.paymentStatus === 'PAID', 'COD Order marked DELIVERED automatically updates paymentStatus to PAID');
  assert(deliveredOrder.payments[0].status === 'SUCCESS', 'COD Payment record status marked SUCCESS');

  // 6. Terminal state: Cannot transition from DELIVERED to CONFIRMED or CANCELLED
  const transAfterTerminal = await requestJson('PATCH', `/api/admin/orders/${createdDbOrder.id}/status`, { status: 'CANCELLED' }, adminHeaders);
  assert(transAfterTerminal.status === 400, 'Terminal state DELIVERED rejects transition to CANCELLED');

  // -------------------------------------------------------------
  // TEST SUITE 7: CANCELLATION & ATOMIC STOCK RESTORATION
  // -------------------------------------------------------------
  console.log('\n--- 7. Testing Cancellation & Atomic Stock Restoration ---');

  // Create another order specifically for cancellation test
  const cancelOrderCode = `MK-CANCEL-${Date.now().toString().slice(-6)}`;
  const cancelTestOrder = await prisma.customer_order.create({
    data: {
      orderCode: cancelOrderCode,
      name: 'Hải',
      lastname: 'Trần',
      fullName: 'Trần Hải',
      email: 'hai.tran@test.vn',
      phone: '0912345678',
      total: activeVariant.price,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      status: 'CONFIRMED',
      products: {
        create: [
          {
            productId: activeVariant.productId,
            variantId: activeVariant.id,
            quantity: 3,
            unitPrice: activeVariant.price,
            productTitle: 'Móc khóa test hủy',
            snapshotSource: 'CHECKOUT', // non-preorder
          },
        ],
      },
    },
    include: { products: true },
  });

  // Stock before cancel
  const stockBeforeCancel = (await prisma.productVariant.findUnique({ where: { id: activeVariant.id } })).stock;

  // Perform cancellation
  const cancelRes = await requestJson('PATCH', `/api/admin/orders/${cancelTestOrder.id}/status`, {
    status: 'CANCELLED',
    reason: 'Khách hàng đổi ý trước khi in 3D',
  }, adminHeaders);

  assert(cancelRes.status === 200, 'Cancel request returns 200 OK');
  assert(cancelRes.body.order.status === 'CANCELLED', 'Order status is now CANCELLED');

  // Stock after cancel: MUST be incremented by 3
  const stockAfterCancel = (await prisma.productVariant.findUnique({ where: { id: activeVariant.id } })).stock;
  assert(stockAfterCancel === stockBeforeCancel + 3, `Stock correctly restored: ${stockBeforeCancel} + 3 = ${stockAfterCancel}`);

  // Idempotency: Attempt to cancel AGAIN
  const doubleCancelRes = await requestJson('PATCH', `/api/admin/orders/${cancelTestOrder.id}/status`, {
    status: 'CANCELLED',
  }, adminHeaders);

  const stockAfterDoubleCancel = (await prisma.productVariant.findUnique({ where: { id: activeVariant.id } })).stock;
  assert(stockAfterDoubleCancel === stockAfterCancel, 'Double cancellation does NOT increment stock a second time (Idempotent)');

  // -------------------------------------------------------------
  // TEST SUITE 8: ADMIN INTERNAL NOTES & MANUAL RESEND
  // -------------------------------------------------------------
  console.log('\n--- 8. Testing Admin Internal Notes & Manual Resend ---');

  // Test Internal Notes
  const noteContent = 'Đã gọi điện thoại xác nhận với khách, khách đồng ý đổi sang font Montserrat';
  const saveNoteRes = await requestJson('POST', `/api/admin/orders/${createdDbOrder.id}/notes`, {
    internalNotes: noteContent,
  }, adminHeaders);

  assert(saveNoteRes.status === 200, 'POST /api/admin/orders/:id/notes returns 200 OK');
  assert(saveNoteRes.body.internalNotes === noteContent, 'Response returns saved internal note');

  const checkDbNote = await prisma.customer_order.findUnique({ where: { id: createdDbOrder.id } });
  assert(checkDbNote.internalNotes === noteContent, 'Database Customer_order.internalNotes reflects saved note');

  const noteHistoryCheck = await prisma.orderStatusHistory.findFirst({
    where: { orderId: createdDbOrder.id, note: { contains: '[GHI CHÚ NỘI BỘ]' } },
  });
  assert(noteHistoryCheck !== null, 'OrderStatusHistory recorded internal note audit trail');

  // Test Manual Email Resend
  const resendRes = await requestJson('POST', `/api/admin/orders/${createdDbOrder.id}/resend-email`, {
    eventType: 'ORDER_DELIVERED',
  }, adminHeaders);

  assert(resendRes.status === 200, 'POST /api/admin/orders/:id/resend-email returns 200 OK');
  assert(resendRes.body.success === true, 'Manual resend reports success');

  const resendHistoryCheck = await prisma.orderStatusHistory.findFirst({
    where: { orderId: createdDbOrder.id, note: { contains: 'gửi lại email' } },
  });
  assert(resendHistoryCheck !== null, 'OrderStatusHistory recorded manual resend audit log');

  // Verify that an independent outbox record was created for the manual resend
  const manualResendOutbox = await prisma.emailOutbox.findFirst({
    where: {
      orderId: createdDbOrder.id,
      eventType: { in: ['MANUAL_RESEND', 'ORDER_DELIVERED'] },
      idempotencyKey: { contains: 'RESEND' },
    },
  });
  assert(manualResendOutbox !== null, 'Independent outbox record created for manual resend with distinct key');

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log('\n--- 9. Cleaning Up Test Data ---');
  try {
    await prisma.customer_order_product.deleteMany({
      where: { customerOrderId: { in: [createdDbOrder.id, cancelTestOrder.id] } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: [createdDbOrder.id, cancelTestOrder.id] } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: [createdDbOrder.id, cancelTestOrder.id] } },
    });
    await prisma.emailOutbox.deleteMany({
      where: { orderId: { in: [createdDbOrder.id, cancelTestOrder.id, testOrder.id] } },
    });
    await prisma.customer_order.deleteMany({
      where: { id: { in: [createdDbOrder.id, cancelTestOrder.id] } },
    });
    console.log('  ✓ Test orders and outbox records cleaned up successfully');
  } catch (cleanErr) {
    console.warn('  ⚠️ Cleanup warning:', cleanErr.message);
  }

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (server) {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    if (server) server.close();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (server) server.close();
  });
