const express = require("express");
const router = express.Router();
const {
  getVariantsByProductId,
  getVariantById,
  checkVariantStock,
} = require("../controllers/variants");

router.get("/product/:productId", getVariantsByProductId);
router.post("/check-stock", checkVariantStock);
router.get("/:id", getVariantById);

module.exports = router;

