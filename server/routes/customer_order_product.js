const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

const {
  createOrderProduct,
  updateProductOrder,
  deleteProductOrder,
  getProductOrder,
  getAllProductOrders
} = require('../controllers/customer_order_product');

// Protect all direct order product endpoints with Admin authentication
router.use(requireAdmin);

router.route('/')
  .get(getAllProductOrders)
  .post(createOrderProduct);

router.route('/:id')
  .get(getProductOrder)
  .put(updateProductOrder) 
  .delete(deleteProductOrder); 

module.exports = router;
