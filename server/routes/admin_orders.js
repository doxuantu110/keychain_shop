const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getAdminOrders,
  getAdminOrderStats,
  getAdminOrderDetail,
  updateAdminOrderStatus,
  saveAdminOrderNotes,
  resendAdminOrderEmail,
} = require('../controllers/admin_orders');

// All admin order endpoints require admin privileges
router.use(requireAdmin);

// Stats KPI endpoint
router.get('/stats', getAdminOrderStats);

// Orders list with pagination & filters
router.get('/', getAdminOrders);

// Order detail
router.get('/:id', getAdminOrderDetail);

// State machine transition
router.patch('/:id/status', updateAdminOrderStatus);

// Admin private internal notes
router.post('/:id/notes', saveAdminOrderNotes);

// Manual transactional email resend
router.post('/:id/resend-email', resendAdminOrderEmail);

module.exports = router;

