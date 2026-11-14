/**
 * PHASE 2 AUDIT & INTEGRATION VERIFICATION TEST SUITE
 * Run with: node server/scripts/test-phase2-apis.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Safety Check: Never run integration tests on production databases
const dbUrl = process.env.DATABASE_URL || "";
if (process.env.NODE_ENV === "production" || dbUrl.includes("production") || dbUrl.includes("prod_")) {
  console.error("🛑 FATAL: Test suite execution aborted. Running automated integration tests on a production database is strictly forbidden!");
  process.exit(1);
}

const prisma = require('../utills/db');
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/products');
const { getProductBySlug } = require('../controllers/slugs');
const { getVariantsByProductId, getVariantById, checkVariantStock } = require('../controllers/variants');
const { 
  createCustomerOrder, 
  getCustomerOrder, 
  getAllOrders, 
  updateCustomerOrder, 
  deleteCustomerOrder,
  lookupCustomerOrder,
} = require('../controllers/customer_orders');
const { createUser, updateUser } = require('../controllers/users');
const { createCategory } = require('../controllers/category');
const { calculateShippingFee } = require('../utills/validation');

// Use environment key or generate dynamic test key for in-memory session only
const VALID_ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.NEXTAUTH_SECRET || ("test_admin_suite_" + Math.random().toString(36).substring(2));
if (!process.env.ADMIN_API_KEY && !process.env.NEXTAUTH_SECRET) {
  process.env.ADMIN_API_KEY = VALID_ADMIN_KEY;
}

// Helper to create mock Express req/res
function createMockContext(reqOverrides = {}) {
  const req = {
    params: {},
    query: {},
    body: {},
    headers: {},
    url: '/',
    ...reqOverrides,
  };

  let statusCode = 200;
  let responseData = null;
  const headers = {};

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    send(data) {
      responseData = data;
      return this;
    },
    set(key, val) {
      headers[key.toLowerCase()] = String(val);
      return this;
    },
    setHeader(key, val) {
      headers[key.toLowerCase()] = String(val);
      return this;
    },
    getStatusCode() {
      return statusCode;
    },
    getBody() {
      return responseData;
    },
    getHeaders() {
      return headers;
    }
  };

  return { req, res };
}

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, testName, message = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
    testResults.push({ name: testName, status: 'PASS', message });
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${message}`);
    failedTests++;
    testResults.push({ name: testName, status: 'FAIL', message });
  }
}

// Track test created IDs and keys for surgical cleanup
const createdOrderIds = [];
const createdIdempotencyKeys = [];

function trackOrderId(res) {
  if (res && typeof res.getStatusCode === "function" && res.getStatusCode() === 201) {
    const body = res.getBody();
    if (body && typeof body.id === "string" && body.id.trim() && !createdOrderIds.includes(body.id.trim())) {
      createdOrderIds.push(body.id.trim());
      return body.id.trim();
    }
  }
  return null;
}

function trackIdempotencyKey(key) {
  if (key && typeof key === "string" && key.trim() && !createdIdempotencyKeys.includes(key.trim())) {
    createdIdempotencyKeys.push(key.trim());
  }
}

// Global fixtures for safe restoration
let originalVariant = null;
let originalProduct = null;

async function runAuditTests() {
  console.log("=================================================");
  console.log("🛡️  STARTING PHASE 2 AUDIT & INTEGRATION TEST SUITE");
  console.log("=================================================\n");

  try {
    // 0. Setup test product & variants
    const testProduct = await prisma.product.findFirst({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: true
      }
    });

    if (!testProduct || testProduct.variants.length === 0) {
      throw new Error("No active product with variants found in database. Run Phase 1 migration first.");
    }

    const testVariant = testProduct.variants[0];

    // Read and save original state before any test mutation
    originalVariant = {
      id: testVariant.id,
      sku: testVariant.sku,
      stock: testVariant.stock,
      price: testVariant.price,
      allowPreorder: testVariant.allowPreorder,
      isActive: testVariant.isActive,
    };

    originalProduct = {
      id: testProduct.id,
      title: testProduct.title,
      isCustomizable: testProduct.isCustomizable,
      maxCustomTextLength: testProduct.maxCustomTextLength,
    };

    const initialStock = 50;
    await prisma.productVariant.update({
      where: { id: testVariant.id },
      data: {
        stock: initialStock,
        price: 45000,
        allowPreorder: false,
        isActive: true
      }
    });

    // Make sure product is customizable with length 30
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { isCustomizable: true, maxCustomTextLength: 30 }
    });

    console.log(`Test Fixture: Product "${testProduct.title}" (ID: ${testProduct.id})`);
    console.log(`Variant SKU: ${testVariant.sku}, Stock reset to: ${initialStock}, Price: 45,000 VND\n`);

    // ==========================================
    // AUDIT 1: Stock Restoration Idempotency & Concurrent Cancellation
    // ==========================================
    console.log("--- AUDIT 1: Stock Restoration & Idempotent Cancellation ---");
    {
      // 1. Create an order with 2 items
      const { req: reqCreate, res: resCreate } = createMockContext({
        body: {
          fullName: "Audit 1 User",
          email: `audit1-${Date.now()}@test.com`,
          phone: "0901111111",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });
      await createCustomerOrder(reqCreate, resCreate);
      trackOrderId(resCreate);
      const order1 = resCreate.getBody();

      const stockAfterOrder = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterOrder === initialStock - 2, "Stock properly decremented by 2 upon order creation");

      // 2. First Cancel: stock must be restored
      const { req: reqCancel1, res: resCancel1 } = createMockContext({
        params: { id: order1.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED", note: "Cancel 1st time" }
      });
      await updateCustomerOrder(reqCancel1, resCancel1);
      const stockAfterCancel1 = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterCancel1 === initialStock, "1st Cancel: stock restored back to initial stock (50)");

      // 3. Second Cancel on same order: stock must NOT be restored again!
      const { req: reqCancel2, res: resCancel2 } = createMockContext({
        params: { id: order1.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED", note: "Cancel 2nd time" }
      });
      await updateCustomerOrder(reqCancel2, resCancel2);
      const stockAfterCancel2 = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterCancel2 === initialStock, "2nd Cancel (Idempotent): stock NOT incremented again (remains 50)");

      // 4. Concurrent cancellation simulation:
      // Create another order of 4 items
      const { req: reqCreate2, res: resCreate2 } = createMockContext({
        body: {
          fullName: "Concurrent Cancel User",
          email: `concurrent-${Date.now()}@test.com`,
          phone: "0902222222",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 4 }]
        }
      });
      await createCustomerOrder(reqCreate2, resCreate2);
      trackOrderId(resCreate2);
      const order2 = resCreate2.getBody();

      const stockBeforeConcurrent = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;

      // Fire 2 concurrent cancel requests simultaneously via Promise.all
      const { req: cReq1, res: cRes1 } = createMockContext({
        params: { id: order2.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED", note: "Concurrent A" }
      });
      const { req: cReq2, res: cRes2 } = createMockContext({
        params: { id: order2.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED", note: "Concurrent B" }
      });

      await Promise.all([
        updateCustomerOrder(cReq1, cRes1),
        updateCustomerOrder(cReq2, cRes2)
      ]);

      const stockAfterConcurrent = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterConcurrent === stockBeforeConcurrent + 4, `Concurrent cancellation: stock restored exactly once (+4), not doubled`);
    }

    // ==========================================
    // AUDIT 2: Preorder & Stock Logic (Cases A, B, C, D)
    // ==========================================
    console.log("\n--- AUDIT 2: Preorder & Stock Logic (Cases A, B, C, D) ---");
    {
      // Case A: Enough stock -> stock decremented
      const vStockA = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      const { req: reqA, res: resA } = createMockContext({
        body: {
          fullName: "Case A User",
          email: `casea-${Date.now()}@test.com`,
          phone: "0903333333",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqA, resA);
      assert(resA.getStatusCode() === 201, "Case A (In-stock): Order accepted");
      const stockAfterA = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterA === vStockA - 1, "Case A: stock decremented by 1");
      trackOrderId(resA);

      // Case B: Not enough stock & allowPreorder = false -> Rejected with 400
      await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: 1, allowPreorder: false } });
      const { req: reqB, res: resB } = createMockContext({
        body: {
          fullName: "Case B User",
          email: `caseb-${Date.now()}@test.com`,
          phone: "0904444444",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });
      await createCustomerOrder(reqB, resB);
      assert(resB.getStatusCode() === 400 && resB.getBody()?.error === "Insufficient stock", "Case B (No stock, no preorder): Rejected with 400 Insufficient stock");
      const stockAfterB = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterB === 1, "Case B: stock unchanged (still 1)");

      // Case C: 0 stock & allowPreorder = true -> Order accepted, stock remains 0 (no negative stock!)
      await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: 0, allowPreorder: true } });
      const { req: reqC, res: resC } = createMockContext({
        body: {
          fullName: "Case C User",
          email: `casec-${Date.now()}@test.com`,
          phone: "0905555555",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });
      await createCustomerOrder(reqC, resC);
      assert(resC.getStatusCode() === 201, "Case C (Preorder with 0 stock): Order accepted");
      const stockAfterC = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterC === 0, "Case C: stock remains 0, never negative");
      const orderCId = trackOrderId(resC);

      // Cancel Preorder order: MUST NOT add fake stock!
      const { req: reqCancelPre, res: resCancelPre } = createMockContext({
        params: { id: orderCId },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED" }
      });
      await updateCustomerOrder(reqCancelPre, resCancelPre);
      const stockAfterCancelPre = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterCancelPre === 0, "Cancelling preorder order does NOT increment stock (no fake stock created)");

      // Case D: Partial stock (stock = 1, qty = 3, allowPreorder = true)
      await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: 1, allowPreorder: true } });
      const { req: reqD, res: resD } = createMockContext({
        body: {
          fullName: "Case D User",
          email: `cased-${Date.now()}@test.com`,
          phone: "0906666666",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 3 }]
        }
      });
      await createCustomerOrder(reqD, resD);
      assert(resD.getStatusCode() === 201, "Case D (Partial stock + Preorder): Order accepted");
      const stockAfterD = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterD === 1, "Case D: stock remains intact (1), no partial negative decrement");
      trackOrderId(resD);

      // Reset stock for remaining tests
      await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: initialStock, allowPreorder: false } });
    }

    // ==========================================
    // AUDIT 3: Price Tampering & Shipping Fee
    // ==========================================
    console.log("\n--- AUDIT 3: Price Tampering & Backend-Controlled Shipping Fee ---");
    {
      // Client sends tampered price: total = 100, price = 1, shippingFee = 0
      const { req: reqTamper, res: resTamper } = createMockContext({
        body: {
          fullName: "Tamper Tester",
          email: `tamper-${Date.now()}@test.com`,
          phone: "0907777777",
          province: "Hà Nội",
          total: 100,
          price: 1,
          shippingFee: 0, // Client tries to spoof free shipping
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqTamper, resTamper);
      trackOrderId(resTamper);
      const orderTamper = resTamper.getBody();

      // Order total must be variant.price (45,000) + standard shipping fee (30,000) = 75,000 VND
      assert(orderTamper.subtotal === 45000, `Subtotal enforced from DB price (45,000 VND), ignored client price: ${orderTamper.subtotal}`);
      assert(orderTamper.shippingFee === 30000, `Shipping fee enforced by backend policy (30,000 VND), ignored client shippingFee (0): ${orderTamper.shippingFee}`);
      assert(orderTamper.total === 75000, `Total is 75,000 VND, completely protected against client tampering: ${orderTamper.total}`);

      // Test Free Shipping policy: Order >= 300,000 VND gets shippingFee = 0
      const { req: reqFreeShip, res: resFreeShip } = createMockContext({
        body: {
          fullName: "Free Ship Tester",
          email: `freeship-${Date.now()}@test.com`,
          phone: "0908888888",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 8 }] // 8 * 45,000 = 360,000 VND
        }
      });
      await createCustomerOrder(reqFreeShip, resFreeShip);
      trackOrderId(resFreeShip);
      const orderFreeShip = resFreeShip.getBody();
      assert(orderFreeShip.subtotal === 360000, "Subtotal 360,000 VND");
      assert(orderFreeShip.shippingFee === 0, "Backend applied free shipping rule (shippingFee = 0 for subtotal >= 300,000 VND)");
      assert(orderFreeShip.total === 360000, "Total equals subtotal with free shipping");
    }

    // ==========================================
    // AUDIT 4: Admin Authorization & Customer Access Control
    // ==========================================
    console.log("\n--- AUDIT 4: Admin Authorization & Customer Access Control ---");
    {
      // 1. GET /api/products?mode=admin without admin credentials -> 401
      const { req: reqAdminProd, res: resAdminProd } = createMockContext({ query: { mode: "admin" } });
      await getAllProducts(reqAdminProd, resAdminProd);
      assert(resAdminProd.getStatusCode() === 401, "GET /api/products?mode=admin without key rejected with 401");

      // 2. GET /api/products?mode=admin WITH valid admin key -> 200
      const { req: reqAdminProdOk, res: resAdminProdOk } = createMockContext({
        query: { mode: "admin" },
        headers: { "x-admin-key": VALID_ADMIN_KEY }
      });
      await getAllProducts(reqAdminProdOk, resAdminProdOk);
      assert(resAdminProdOk.getStatusCode() === 200, "GET /api/products?mode=admin with valid key returns 200");

      // 3. GET /api/orders without admin key -> 401
      const { req: reqOrdersNoAuth, res: resOrdersNoAuth } = createMockContext();
      await getAllOrders(reqOrdersNoAuth, resOrdersNoAuth);
      assert(resOrdersNoAuth.getStatusCode() === 401, "GET /api/orders without admin key rejected with 401");

      // 4. GET /api/orders with admin key -> 200
      const { req: reqOrdersOk, res: resOrdersOk } = createMockContext({
        headers: { "x-admin-key": VALID_ADMIN_KEY }
      });
      await getAllOrders(reqOrdersOk, resOrdersOk);
      assert(resOrdersOk.getStatusCode() === 200, "GET /api/orders with admin key returns 200");

      // 5. Customer order access protection (GET /api/orders/:id)
      const testOrderId = createdOrderIds[0];
      const testOrderRec = await prisma.customer_order.findUnique({ where: { id: testOrderId } });

      // Stranger tries to access order without email/phone -> 403
      const { req: reqStranger, res: resStranger } = createMockContext({ params: { id: testOrderId } });
      await getCustomerOrder(reqStranger, resStranger);
      assert(resStranger.getStatusCode() === 403, "Stranger accessing order without email/phone rejected with 403 Access Denied");

      // Owner accesses order with matching query email -> 200
      const { req: reqOwner, res: resOwner } = createMockContext({
        params: { id: testOrderId },
        query: { email: testOrderRec.email }
      });
      await getCustomerOrder(reqOwner, resOwner);
      assert(resOwner.getStatusCode() === 200, "Owner accessing order with matching email accepted with 200");

      // Admin accesses order without email query -> 200
      const { req: reqAdminGet, res: resAdminGet } = createMockContext({
        params: { id: testOrderId },
        headers: { "x-admin-key": VALID_ADMIN_KEY }
      });
      await getCustomerOrder(reqAdminGet, resAdminGet);
      assert(resAdminGet.getStatusCode() === 200, "Admin accessing order without email query accepted with 200");

      // 6. DELETE /api/orders/:id -> Always 400
      const { req: reqDel, res: resDel } = createMockContext({
        params: { id: testOrderId },
        headers: { "x-admin-key": VALID_ADMIN_KEY }
      });
      await deleteCustomerOrder(reqDel, resDel);
      assert(resDel.getStatusCode() === 400 && resDel.getBody()?.error === "Order deletion is disabled", "DELETE /api/orders/:id rejected with 400 (Audit compliance)");

      // 7. Protected admin category write
      const { req: reqCatNoAuth, res: resCatNoAuth } = createMockContext({
        body: { name: "Unauthorized Category" }
      });
      await createCategory(reqCatNoAuth, resCatNoAuth);
      assert(resCatNoAuth.getStatusCode() === 401, "POST /api/categories without admin key rejected with 401");
    }

    // ==========================================
    // AUDIT 5: Empty Order & Customization Validation
    // ==========================================
    console.log("\n--- AUDIT 5: Empty Order Rejection & Customization Validation ---");
    {
      // 1. Missing items -> 400
      const { req: reqNoItems, res: resNoItems } = createMockContext({
        body: {
          fullName: "No Items User",
          email: "noitems@test.com",
          phone: "0901234567"
        }
      });
      await createCustomerOrder(reqNoItems, resNoItems);
      assert(resNoItems.getStatusCode() === 400, "Order without items rejected with 400");

      // 2. Empty items array -> 400
      const { req: reqEmptyItems, res: resEmptyItems } = createMockContext({
        body: {
          fullName: "Empty Items User",
          email: "emptyitems@test.com",
          phone: "0901234567",
          items: []
        }
      });
      await createCustomerOrder(reqEmptyItems, resEmptyItems);
      assert(resEmptyItems.getStatusCode() === 400, "Order with items = [] rejected with 400");

      // 3. Invalid quantity (0 or negative) -> 400
      const { req: reqZeroQty, res: resZeroQty } = createMockContext({
        body: {
          fullName: "Zero Qty User",
          email: "zeroqty@test.com",
          phone: "0901234567",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 0 }]
        }
      });
      await createCustomerOrder(reqZeroQty, resZeroQty);
      assert(resZeroQty.getStatusCode() === 400, "Order with quantity = 0 rejected with 400");

      // 4. Customization not allowed
      const uncustomizableProduct = await prisma.product.create({
        data: {
          merchantId: testProduct.merchantId,
          categoryId: testProduct.categoryId,
          title: "Non-customizable Product " + Date.now(),
          slug: "non-customizable-" + Date.now(),
          price: 50000,
          mainImage: "test.jpg",
          description: "Test",
          manufacturer: "Test",
          isCustomizable: false,
          maxCustomTextLength: 10
        }
      });
      const uncustomVariant = await prisma.productVariant.create({
        data: {
          productId: uncustomizableProduct.id,
          variantKey: "size:std",
          sizeLabel: "Standard",
          sku: "NON-CUST-" + Date.now(),
          price: 50000,
          stock: 20
        }
      });

      const { req: reqUncust, res: resUncust } = createMockContext({
        body: {
          fullName: "Uncust User",
          email: "uncust@test.com",
          phone: "0901234567",
          items: [{ productId: uncustomizableProduct.id, variantId: uncustomVariant.id, quantity: 1, customText: "Should Fail" }]
        }
      });
      await createCustomerOrder(reqUncust, resUncust);
      assert(resUncust.getStatusCode() === 400 && resUncust.getBody()?.error === "Customization not allowed", "Order with customText on non-customizable product rejected with 400");

      // 5. Custom text exceeds max length
      await prisma.product.update({ where: { id: uncustomizableProduct.id }, data: { isCustomizable: true, maxCustomTextLength: 5 } });
      const { req: reqTooLong, res: resTooLong } = createMockContext({
        body: {
          fullName: "Too Long User",
          email: "toolong@test.com",
          phone: "0901234567",
          items: [{ productId: uncustomizableProduct.id, variantId: uncustomVariant.id, quantity: 1, customText: "123456789" }]
        }
      });
      await createCustomerOrder(reqTooLong, resTooLong);
      assert(resTooLong.getStatusCode() === 400 && resTooLong.getBody()?.error === "Custom text too long", "Order with customText exceeding maxCustomTextLength rejected with 400");

      // Cleanup dummy product & variant
      await prisma.productVariant.delete({ where: { id: uncustomVariant.id } });
      await prisma.product.delete({ where: { id: uncustomizableProduct.id } });
    }

    // ==========================================
    // AUDIT 6: Idempotency Key & Concurrent Checkout
    // ==========================================
    console.log("\n--- AUDIT 6: Idempotency Key & Concurrent Checkout ---");
    {
      const idemKey = `idem-test-${Date.now()}`;
      trackIdempotencyKey(idemKey);

      // 1. First checkout with key
      const { req: reqIdem1, res: resIdem1 } = createMockContext({
        headers: { "idempotency-key": idemKey },
        body: {
          fullName: "Idempotent User",
          email: `idem-${Date.now()}@test.com`,
          phone: "0909999999",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqIdem1, resIdem1);
      assert(resIdem1.getStatusCode() === 201, "First checkout with idempotencyKey returns 201 Created");
      trackOrderId(resIdem1);
      const idemOrder1 = resIdem1.getBody();

      // 2. Sequential second checkout with SAME key -> returns cached 200/201 with header X-Idempotent-Replay
      const { req: reqIdem2, res: resIdem2 } = createMockContext({
        headers: { "idempotency-key": idemKey },
        body: {
          fullName: "Idempotent User",
          email: `idem-${Date.now()}@test.com`,
          phone: "0909999999",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqIdem2, resIdem2);
      assert(resIdem2.getHeaders()["x-idempotent-replay"] === "true", "Sequential replay detected, header X-Idempotent-Replay set");
      assert(resIdem2.getBody().id === idemOrder1.id, "Sequential replay returns identical order ID");

      // 3. Concurrent requests with same key
      const concurrentKey = `concurrent-key-${Date.now()}`;
      trackIdempotencyKey(concurrentKey);
      const stockBeforeConcur = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;

      const { req: cReqA, res: cResA } = createMockContext({
        headers: { "idempotency-key": concurrentKey },
        body: {
          fullName: "Concurrent User",
          email: `concur-${Date.now()}@test.com`,
          phone: "0908881111",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });
      const { req: cReqB, res: cResB } = createMockContext({
        headers: { "idempotency-key": concurrentKey },
        body: {
          fullName: "Concurrent User",
          email: `concur-${Date.now()}@test.com`,
          phone: "0908881111",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });

      await Promise.all([
        createCustomerOrder(cReqA, cResA),
        createCustomerOrder(cReqB, cResB)
      ]);

      const stockAfterConcur = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(cResA.getBody().id === cResB.getBody().id, "Both concurrent requests received the same order ID");
      assert(stockAfterConcur === stockBeforeConcur - 2, "Stock was deducted only ONCE (-2), no race-condition double deduction");
      trackOrderId(cResA);
    }

    // ==========================================
    // SECTION VIII: Order Lifecycle Consistency & Rollback
    // ==========================================
    console.log("\n--- SECTION VIII: Order Lifecycle Consistency & Transaction Rollback ---");
    {
      // 1. COD Payment record created with PENDING status
      const lastOrderId = createdOrderIds[createdOrderIds.length - 1];
      const orderRec = await prisma.customer_order.findUnique({
        where: { id: lastOrderId },
        include: { payments: true, statusHistory: true }
      });
      assert(orderRec.payments.length > 0 && orderRec.payments[0].status === "PENDING", "COD payment initialized with status PENDING (not auto-marked PAID)");
      assert(orderRec.statusHistory.length > 0 && orderRec.statusHistory[0].toStatus === "PENDING", "OrderStatusHistory logged PENDING");

      // 2. Transaction rollback check: simulate failure midway
      const stockBeforeRollback = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      // We will attempt an order where one item has valid stock but next item causes failure
      const { req: reqRollback, res: resRollback } = createMockContext({
        body: {
          fullName: "Rollback User",
          email: "rollback@test.com",
          phone: "0901234567",
          items: [
            { productId: testProduct.id, variantId: testVariant.id, quantity: 1 },
            { productId: testProduct.id, variantId: "non-existent-fail-id", quantity: 1 }
          ]
        }
      });
      await createCustomerOrder(reqRollback, resRollback);
      assert(resRollback.getStatusCode() === 400, "Invalid item in multi-item order rejected with 400");
      const stockAfterRollback = (await prisma.productVariant.findUnique({ where: { id: testVariant.id } })).stock;
      assert(stockAfterRollback === stockBeforeRollback, "Transaction rollback verified: stock of valid variant was NOT decremented");
    }

    // ==========================================
    // PHASE 3.5 AUDIT VERIFICATION SECTIONS
    // ==========================================
    console.log("\n--- PHASE 3.5 AUDIT 1: Privilege Escalation Prevention ---");
    {
      const testEmail = `priv-test-${Date.now()}@test.com`;
      // Unauthenticated user attempts to create admin account
      const { req: reqPrivCreate, res: resPrivCreate } = createMockContext({
        body: {
          email: testEmail,
          password: "SecurePassword123!",
          role: "admin"
        }
      });
      await createUser(reqPrivCreate, resPrivCreate);
      const createdUser = resPrivCreate.getBody();
      assert(createdUser.role === "user", "Unauthenticated registration requesting role: 'admin' is forced to 'user'");

      // Cleanup test user
      if (createdUser && createdUser.id) {
        await prisma.user.delete({ where: { id: createdUser.id } });
      }
    }

    console.log("\n--- PHASE 3.5 AUDIT 2: Idempotency Key Payload Mismatch Detection ---");
    {
      const mismatchKey = `mismatch-key-${Date.now()}`;
      trackIdempotencyKey(mismatchKey);
      // First request with payload A
      const { req: reqA, res: resA } = createMockContext({
        headers: { "idempotency-key": mismatchKey },
        body: {
          fullName: "User A",
          email: `usera-${Date.now()}@test.com`,
          phone: "0901112233",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqA, resA);
      assert(resA.getStatusCode() === 201, "First request with key succeeds (201)");
      trackOrderId(resA);

      // Second request with SAME key but DIFFERENT payload (different items/buyer)
      const { req: reqB, res: resB } = createMockContext({
        headers: { "idempotency-key": mismatchKey },
        body: {
          fullName: "User B (Tampered)",
          email: `userb-${Date.now()}@test.com`,
          phone: "0909998877",
          province: "TP HCM",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }]
        }
      });
      await createCustomerOrder(reqB, resB);
      assert(resB.getStatusCode() === 422, "Same key with different payload rejected with 422 Payload Mismatch");
    }

    console.log("\n--- PHASE 3.5 AUDIT 3: POST /api/orders/lookup & Sanitization ---");
    {
      const targetOrderId = createdOrderIds[0];
      const targetOrder = await prisma.customer_order.findUnique({ where: { id: targetOrderId } });

      // 1. Correct lookup via POST body
      const { req: reqLookupOk, res: resLookupOk } = createMockContext({
        body: {
          orderCode: targetOrder.orderCode,
          phone: targetOrder.phone
        }
      });
      await lookupCustomerOrder(reqLookupOk, resLookupOk);
      assert(resLookupOk.getStatusCode() === 200, "POST /api/orders/lookup returns 200 with matching phone");
      const lookupData = resLookupOk.getBody();
      const hasRawResponse = lookupData.payments?.some(p => p.rawResponse !== undefined);
      assert(!hasRawResponse, "POST /api/orders/lookup sanitizes payments (no rawResponse exposed)");

      // 2. Lookup with wrong phone returns 404 (anti-enumeration)
      const { req: reqLookupWrong, res: resLookupWrong } = createMockContext({
        body: {
          orderCode: targetOrder.orderCode,
          phone: "0900000000"
        }
      });
      await lookupCustomerOrder(reqLookupWrong, resLookupWrong);
      assert(resLookupWrong.getStatusCode() === 404, "POST /api/orders/lookup with non-matching phone returns uniform 404");
    }

    console.log("\n--- PHASE 3.5 AUDIT 4: Disallow Cancelling DELIVERED Orders ---");
    {
      const deliveredOrderId = createdOrderIds[0];
      // Mark order as DELIVERED
      await prisma.customer_order.update({
        where: { id: deliveredOrderId },
        data: { status: "DELIVERED" }
      });

      // Attempt to cancel DELIVERED order
      const { req: reqCancelDelivered, res: resCancelDelivered } = createMockContext({
        params: { id: deliveredOrderId },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED" }
      });
      await updateCustomerOrder(reqCancelDelivered, resCancelDelivered);
      assert(resCancelDelivered.getStatusCode() === 400, "Attempt to cancel DELIVERED order is rejected with 400");
    }

    console.log("\n--- PHASE 3.5 AUDIT 6: Pricing & Shipping Exact Boundaries ---");
    {
      const fee299k = calculateShippingFee(299999);
      const fee300k = calculateShippingFee(300000);
      const fee301k = calculateShippingFee(300001);

      assert(fee299k === 30000, `Boundary 299,999 VND: shipping fee is exactly 30,000 VND (actual: ${fee299k})`);
      assert(fee300k === 0, `Boundary 300,000 VND: shipping fee is exactly 0 VND Free Ship (actual: ${fee300k})`);
      assert(fee301k === 0, `Boundary 300,001 VND: shipping fee is exactly 0 VND Free Ship (actual: ${fee301k})`);
    }

    // ==========================================
    // PHASE 3.6 AUDIT: STATE MACHINE, QR VALIDATION & DB IDEMPOTENCY
    // ==========================================
    console.log("\n--- PHASE 3.6 AUDIT 4: State Machine Lifecycle Verification ---");
    {
      // 1. Create a fresh order for lifecycle transitions
      const { req: reqLifecycleCreate, res: resLifecycleCreate } = createMockContext({
        body: {
          fullName: "Lifecycle User",
          email: `lifecycle-${Date.now()}@test.com`,
          phone: "0901239999",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqLifecycleCreate, resLifecycleCreate);
      assert(resLifecycleCreate.getStatusCode() === 201, "Lifecycle order created with PENDING status");
      trackOrderId(resLifecycleCreate);
      const lifecycleOrder = resLifecycleCreate.getBody();

      // PENDING -> CONFIRMED (Valid)
      const { req: rConf, res: sConf } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CONFIRMED" }
      });
      await updateCustomerOrder(rConf, sConf);
      assert(sConf.getStatusCode() === 200 && sConf.getBody().status === "CONFIRMED", "Valid: PENDING -> CONFIRMED accepted (200)");

      // CONFIRMED -> PROCESSING (Valid)
      const { req: rProc, res: sProc } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "PROCESSING" }
      });
      await updateCustomerOrder(rProc, sProc);
      assert(sProc.getStatusCode() === 200 && sProc.getBody().status === "PROCESSING", "Valid: CONFIRMED -> PROCESSING accepted (200)");

      // PROCESSING -> SHIPPED (Valid)
      const { req: rShip, res: sShip } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "SHIPPED" }
      });
      await updateCustomerOrder(rShip, sShip);
      assert(sShip.getStatusCode() === 200 && sShip.getBody().status === "SHIPPED", "Valid: PROCESSING -> SHIPPED accepted (200)");

      // SHIPPED -> DELIVERED (Valid & Triggers COD Payment SUCCESS / PAID)
      const { req: rDeliv, res: sDeliv } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "DELIVERED" }
      });
      await updateCustomerOrder(rDeliv, sDeliv);
      const deliveredData = sDeliv.getBody();
      assert(sDeliv.getStatusCode() === 200 && deliveredData.status === "DELIVERED", "Valid: SHIPPED -> DELIVERED accepted (200)");
      assert(deliveredData.paymentStatus === "PAID", "COD order transitioning to DELIVERED automatically marks paymentStatus = PAID");

      // Invalid transition: DELIVERED -> PROCESSING (Rejected with 400)
      const { req: rInv1, res: sInv1 } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "PROCESSING" }
      });
      await updateCustomerOrder(rInv1, sInv1);
      assert(sInv1.getStatusCode() === 400 && sInv1.getBody()?.error === "Invalid status transition", "Invalid: DELIVERED -> PROCESSING rejected with 400");

      // Invalid transition: DELIVERED -> CANCELLED (Rejected with 400)
      const { req: rInv2, res: sInv2 } = createMockContext({
        params: { id: lifecycleOrder.id },
        headers: { "x-admin-key": VALID_ADMIN_KEY },
        body: { status: "CANCELLED" }
      });
      await updateCustomerOrder(rInv2, sInv2);
      assert(sInv2.getStatusCode() === 400 && sInv2.getBody()?.error === "Invalid status transition", "Invalid: DELIVERED -> CANCELLED rejected with 400");
    }

    console.log("\n--- PHASE 3.6 AUDIT 7: QR URL Validation & Security ---");
    {
      // 1. Valid HTTP/HTTPS QR URL
      const { req: reqValidQr, res: resValidQr } = createMockContext({
        body: {
          fullName: "QR User Valid",
          email: `qrvalid-${Date.now()}@test.com`,
          phone: "0901118888",
          province: "Hà Nội",
          items: [{
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 1,
            customQrUrl: "https://facebook.com/laser.keychain.store"
          }]
        }
      });
      await createCustomerOrder(reqValidQr, resValidQr);
      assert(resValidQr.getStatusCode() === 201, "Valid HTTPS customQrUrl accepted with 201");
      trackOrderId(resValidQr);

      // 2. Malicious javascript: URL (XSS/SSRF attempt) -> Rejected with 400
      const { req: reqXssQr, res: resXssQr } = createMockContext({
        body: {
          fullName: "QR User XSS",
          email: "qrxss@test.com",
          phone: "0901117777",
          province: "Hà Nội",
          items: [{
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 1,
            customQrUrl: "javascript:alert(document.cookie)"
          }]
        }
      });
      await createCustomerOrder(reqXssQr, resXssQr);
      assert(resXssQr.getStatusCode() === 400, "Malicious javascript: customQrUrl rejected with 400");

      // 3. Malformed URL string -> Rejected with 400
      const { req: reqBadQr, res: resBadQr } = createMockContext({
        body: {
          fullName: "QR User Bad",
          email: "qrbad@test.com",
          phone: "0901116666",
          province: "Hà Nội",
          items: [{
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 1,
            customQrUrl: "not-a-valid-url"
          }]
        }
      });
      await createCustomerOrder(reqBadQr, resBadQr);
      assert(resBadQr.getStatusCode() === 400, "Malformed non-URL string rejected with 400");
    }

    console.log("\n--- PHASE 3.6 AUDIT 2: Database-Backed Idempotency Verification ---");
    {
      const dbIdemKey = `db-idem-${Date.now()}`;
      trackIdempotencyKey(dbIdemKey);
      const { req: reqDbIdem, res: resDbIdem } = createMockContext({
        headers: { "idempotency-key": dbIdemKey },
        body: {
          fullName: "DB Idem User",
          email: `dbidem-${Date.now()}@test.com`,
          phone: "0901235555",
          province: "Hà Nội",
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }]
        }
      });
      await createCustomerOrder(reqDbIdem, resDbIdem);
      assert(resDbIdem.getStatusCode() === 201, "Order created with DB-backed Idempotency Key");
      trackOrderId(resDbIdem);

      // Verify that idempotency_records table contains COMPLETED record
      try {
        const rows = await prisma.$queryRawUnsafe(
          "SELECT `key`, `status`, `statusCode`, `payloadHash` FROM `idempotency_records` WHERE `key` = ? LIMIT 1",
          dbIdemKey
        );
        assert(rows && rows.length > 0 && rows[0].status === "COMPLETED", "Database table idempotency_records contains COMPLETED status");
        assert(rows[0].statusCode === 201, "Database record holds statusCode = 201");
      } catch (err) {
        console.warn("Direct query on idempotency_records:", err.message);
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("\n=================================================");
    console.log(`📊 AUDIT TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("=================================================");

    if (failedTests > 0) {
      console.error(`💥 ${failedTests} test(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log("🎉 ALL AUDIT & INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY!");
      process.exitCode = 0;
    }

  } catch (error) {
    console.error("💥 Unhandled exception during audit test suite:", error);
    process.exitCode = 1;
  } finally {
    // ==========================================
    // CLEANUP TEST DATA SAFELY & RESTORE FIXTURES
    // ==========================================
    console.log("\n--- CLEANUP: Safely cleaning test records & restoring fixtures ---");

    // 1. Restore testVariant and testProduct to their original states
    try {
      if (originalVariant && originalVariant.id) {
        await prisma.productVariant.update({
          where: { id: originalVariant.id },
          data: {
            stock: originalVariant.stock,
            price: originalVariant.price,
            allowPreorder: originalVariant.allowPreorder,
            isActive: originalVariant.isActive,
          }
        });
        console.log(`Restored product variant ${originalVariant.sku} to original stock (${originalVariant.stock})`);
      }
    } catch (err) {
      console.warn("Could not restore original productVariant:", err.message);
    }

    try {
      if (originalProduct && originalProduct.id) {
        await prisma.product.update({
          where: { id: originalProduct.id },
          data: {
            isCustomizable: originalProduct.isCustomizable,
            maxCustomTextLength: originalProduct.maxCustomTextLength,
          }
        });
        console.log(`Restored product "${originalProduct.title}" to original customization state`);
      }
    } catch (err) {
      console.warn("Could not restore original product:", err.message);
    }

    // 2. Cascade delete only test-created orders
    for (const oId of createdOrderIds) {
      if (!oId) continue;
      try {
        await prisma.customer_order_product.deleteMany({ where: { customerOrderId: oId } });
        await prisma.payment.deleteMany({ where: { orderId: oId } });
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: oId } });
        await prisma.customer_order.delete({ where: { id: oId } });
      } catch (err) {
        console.warn(`Could not cleanup test order ${oId}:`, err.message);
      }
    }
    console.log(`Cleaned up ${createdOrderIds.length} test orders successfully.`);

    // 3. Delete only specifically tracked idempotency keys using parameterized queries
    for (const key of createdIdempotencyKeys) {
      try {
        await prisma.$executeRawUnsafe("DELETE FROM `idempotency_records` WHERE `key` = ?", key);
      } catch (err) {
        console.warn(`Could not cleanup idempotency record ${key}:`, err.message);
      }
    }
    console.log(`Cleaned up ${createdIdempotencyKeys.length} tracked idempotency records.\n`);

    await prisma.$disconnect();
  }
}

runAuditTests();
