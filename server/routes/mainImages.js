const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const { uploadMainImage } = require("../controllers/mainImages");

router.route("/").post(requireAdmin, uploadMainImage);

module.exports = router;
