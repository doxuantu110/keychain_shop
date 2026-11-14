const express = require('express');
const router = express.Router();

const {
  createCheckoutSession,
  handleSepayIpn,
  getPaymentStatus,
} = require('../controllers/payments');

// Khởi tạo phiên thanh toán SePay
router.post('/sepay/checkout-session', createCheckoutSession);

// IPN callback từ Cổng thanh toán SePay
router.post('/sepay/ipn', handleSepayIpn);

// Kiểm tra trạng thái thanh toán theo orderCode
router.get('/sepay/status/:orderCode', getPaymentStatus);

module.exports = router;

