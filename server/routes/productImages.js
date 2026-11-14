const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getSingleProductImages,
  createImage,
  updateImage,
  deleteImage
} = require('../controllers/productImages');

router.route('/:id').get(getSingleProductImages); 
router.route('/').post(requireAdmin, createImage);
router.route('/:id').put(requireAdmin, updateImage);
router.route('/:id').delete(requireAdmin, deleteImage);

module.exports = router;
