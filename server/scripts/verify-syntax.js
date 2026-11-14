const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

console.log("Verifying module syntax and loading...");

try {
  console.log("Loading db.js...");
  require('../utills/db');

  console.log("Loading errorHandler.js...");
  require('../utills/errorHandler');

  console.log("Loading validation.js...");
  require('../utills/validation');

  console.log("Loading idempotency.js...");
  require('../utills/idempotency');

  console.log("Loading auth.js middleware...");
  require('../middleware/auth');

  console.log("Loading products controller...");
  require('../controllers/products');

  console.log("Loading slugs controller...");
  require('../controllers/slugs');

  console.log("Loading search controller...");
  require('../controllers/search');

  console.log("Loading variants controller...");
  require('../controllers/variants');

  console.log("Loading customer_orders controller...");
  require('../controllers/customer_orders');

  console.log("Loading customer_order_product controller...");
  require('../controllers/customer_order_product');

  console.log("Loading users controller...");
  require('../controllers/users');

  console.log("Loading category controller...");
  require('../controllers/category');

  console.log("Loading emailService and sepayService...");
  require('../services/emailService');
  require('../services/sepayService');
  require('../controllers/payments');
  require('../routes/payments');

  console.log("Loading routes...");
  require('../routes/products');
  require('../routes/slugs');
  require('../routes/variants');
  require('../routes/customer_orders');
  require('../routes/customer_order_product');
  require('../routes/merchant');
  require('../routes/bulkUpload');
  require('../routes/productImages');
  require('../routes/mainImages');

  console.log("✅ All modules loaded and syntax verified successfully!");
  process.exit(0);
} catch (err) {
  console.error("❌ Module syntax or load error:", err);
  process.exit(1);
}

