const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");

const {
  uploadCsvAndCreateBatch,
  listBatches,
  getBatchDetail,
  updateBatchItems,
  deleteBatch,
} = require("../controllers/bulkUpload");

// Audit 1: Bảo vệ toàn bộ endpoint bulk-upload bằng quyền Admin
router.use(requireAdmin);

router.route("/")
  .post(uploadCsvAndCreateBatch)
  .get(listBatches);

router.route("/:batchId")
  .get(getBatchDetail)
  .put(updateBatchItems)
  .delete(deleteBatch);

module.exports = router;
