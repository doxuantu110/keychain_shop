const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const {
  getAllMerchants,
  getMerchantById,
  createMerchant,
  updateMerchant,
  deleteMerchant,
} = require("../controllers/merchant");

// Get all merchants
router.get("/", getAllMerchants);

// Get a specific merchant by ID
router.get("/:id", getMerchantById);

// Create a new merchant (Admin Only)
router.post("/", requireAdmin, createMerchant);

// Update a merchant (Admin Only)
router.put("/:id", requireAdmin, updateMerchant);

// Delete a merchant (Admin Only)
router.delete("/:id", requireAdmin, deleteMerchant);

module.exports = router;
