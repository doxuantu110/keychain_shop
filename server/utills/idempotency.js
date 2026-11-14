const crypto = require("crypto");
const prisma = require("./db");

// Fast memory cache (Layer 1) backed by MySQL Database (Layer 2 - Source of Truth)
const inFlightRequests = new Map();
const memoryCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds max processing lock

let isTableInitialized = false;

/**
 * Đảm bảo bảng idempotency_records tồn tại trong Database (Auto-migration fallback)
 */
async function ensureIdempotencyTable() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`idempotency_records\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`key\` VARCHAR(191) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
        \`payloadHash\` VARCHAR(64) NOT NULL,
        \`statusCode\` INTEGER NULL,
        \`responseBody\` JSON NULL,
        \`orderId\` VARCHAR(191) NULL,
        \`lockedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`completedAt\` DATETIME(3) NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

        UNIQUE INDEX \`idempotency_records_key_key\`(\`key\`),
        INDEX \`idempotency_records_status_expiresAt_idx\`(\`status\`, \`expiresAt\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    isTableInitialized = true;
  } catch (err) {
    console.warn("[Idempotency] Note on DB table init:", err.message);
  }
}

/**
 * Tính toán mã băm SHA-256 của request payload để phát hiện thay đổi nội dung (Request Fingerprint)
 */
function computePayloadHash(payload) {
  if (!payload) return null;
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Lấy idempotencyKey từ request header hoặc body
 */
function extractIdempotencyKey(req) {
  const headerKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (headerKey && typeof headerKey === "string" && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  if (req.body && req.body.idempotencyKey && typeof req.body.idempotencyKey === "string") {
    return req.body.idempotencyKey.trim();
  }

  return null;
}

/**
 * Đọc bản ghi Idempotency từ Database
 */
async function getDbIdempotencyRecord(key) {
  await ensureIdempotencyTable();
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT `id`, `key`, `status`, `payloadHash`, `statusCode`, `responseBody`, `orderId`, `lockedAt`, `completedAt`, `expiresAt` FROM `idempotency_records` WHERE `key` = ? LIMIT 1",
      key
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      let parsedBody = r.responseBody;
      if (typeof parsedBody === "string") {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (e) {}
      }
      return {
        id: r.id,
        key: r.key,
        status: r.status,
        payloadHash: r.payloadHash,
        statusCode: r.statusCode || 200,
        responseBody: parsedBody,
        orderId: r.orderId,
        lockedAt: new Date(r.lockedAt).getTime(),
        completedAt: r.completedAt ? new Date(r.completedAt).getTime() : null,
        expiresAt: new Date(r.expiresAt).getTime(),
      };
    }
  } catch (err) {
    // Fallback sang bảng _migration_audit_log nếu chưa thể query bảng mới
    try {
      const dbRecord = await prisma.migrationAuditLog.findFirst({
        where: { phase: "IDEMPOTENCY", tableName: "Customer_order", recordId: key },
      });
      if (dbRecord && dbRecord.newData) {
        return {
          key,
          status: "COMPLETED",
          payloadHash: dbRecord.oldData?.payloadHash || null,
          statusCode: 200,
          responseBody: dbRecord.newData,
        };
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Ghi trạng thái COMPLETED vào Database
 */
async function setDbIdempotencyCompleted(key, statusCode, body, orderId = null) {
  await ensureIdempotencyTable();
  const bodyJson = JSON.stringify(body);
  try {
    await prisma.$executeRawUnsafe(
      "UPDATE `idempotency_records` SET `status` = 'COMPLETED', `statusCode` = ?, `responseBody` = ?, `orderId` = ?, `completedAt` = NOW(3), `updatedAt` = NOW(3) WHERE `key` = ?",
      statusCode,
      bodyJson,
      orderId,
      key
    );
  } catch (err) {
    console.warn("[Idempotency] Could not update DB record to COMPLETED:", err.message);
  }

  // Backup sang _migration_audit_log
  try {
    await prisma.migrationAuditLog.create({
      data: {
        phase: "IDEMPOTENCY",
        tableName: "Customer_order",
        recordId: key,
        action: "ORDER_CREATED",
        oldData: { payloadHash: computePayloadHash(body) },
        newData: body,
      },
    });
  } catch (e) {}
}

/**
 * Ghi trạng thái FAILED vào Database khi transaction thất bại
 */
async function setDbIdempotencyFailed(key) {
  await ensureIdempotencyTable();
  try {
    await prisma.$executeRawUnsafe(
      "UPDATE `idempotency_records` SET `status` = 'FAILED', `updatedAt` = NOW(3) WHERE `key` = ?",
      key
    );
  } catch (err) {
    console.warn("[Idempotency] Could not update DB record to FAILED:", err.message);
  }
}

/**
 * Khóa nguyên tử ở tầng cơ sở dữ liệu (Database-Backed Distributed Lock)
 */
async function acquireDatabaseLock(key, payloadHash) {
  await ensureIdempotencyTable();
  const recordId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  try {
    // Cố gắng INSERT một bản ghi PROCESSING. Nếu key đã tồn tại, MySQL sẽ tung lỗi DUPLICATE KEY (1062)
    await prisma.$executeRawUnsafe(
      "INSERT INTO `idempotency_records` (`id`, `key`, `status`, `payloadHash`, `lockedAt`, `expiresAt`, `createdAt`, `updatedAt`) VALUES (?, ?, 'PROCESSING', ?, NOW(3), ?, NOW(3), NOW(3))",
      recordId,
      key,
      payloadHash || "",
      expiresAt
    );
    return { acquired: true };
  } catch (err) {
    const isDup = err.message?.includes("idempotency_records_key_key") || 
                  err.message?.includes("Duplicate entry") ||
                  err.code === "P2002" ||
                  err.code === "P2010";

    if (!isDup) {
      console.warn("[Idempotency] Unexpected lock acquisition error:", err.message);
      return { acquired: true }; // Fallback an toàn nếu có lỗi DDL
    }

    // Key đã tồn tại trong DB -> Truy vấn trạng thái
    const existing = await getDbIdempotencyRecord(key);
    if (!existing) {
      return { acquired: true };
    }

    // Kiểm tra fingerprint mismatch
    if (payloadHash && existing.payloadHash && existing.payloadHash !== payloadHash) {
      return { acquired: false, mismatch: true };
    }

    // Nếu đã hoàn thành -> trả về dữ liệu replay
    if (existing.status === "COMPLETED") {
      return {
        acquired: false,
        completed: true,
        statusCode: existing.statusCode || 200,
        body: existing.responseBody,
      };
    }

    // Nếu đang PROCESSING: Kiểm tra xem có bị quá hạn lock (crash) không
    if (existing.status === "PROCESSING") {
      const lockAge = Date.now() - (existing.lockedAt || 0);
      if (lockAge > LOCK_TIMEOUT_MS) {
        // Khóa trước đó bị timeout/crash -> Tái sở hữu khóa
        try {
          await prisma.$executeRawUnsafe(
            "UPDATE `idempotency_records` SET `status` = 'PROCESSING', `lockedAt` = NOW(3) WHERE `key` = ? AND `status` = 'PROCESSING'",
            key
          );
          return { acquired: true };
        } catch (e) {}
      }
      return { acquired: false, inFlight: true };
    }

    // Nếu FAILED -> Cho phép thử lại
    if (existing.status === "FAILED") {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE `idempotency_records` SET `status` = 'PROCESSING', `lockedAt` = NOW(3) WHERE `key` = ?",
          key
        );
        return { acquired: true };
      } catch (e) {}
    }

    return { acquired: true };
  }
}

/**
 * Wrapper thực thi logic với bảo vệ Idempotency chuẩn Database-Backed
 */
async function executeWithIdempotency(key, handlerFn, requestPayload = null) {
  if (!key) {
    // Không có idempotencyKey -> chạy bình thường
    return await handlerFn();
  }

  const currentPayloadHash = computePayloadHash(requestPayload);

  // 1. Kiểm tra cache nhanh trong bộ nhớ (Layer 1)
  const memCached = memoryCache.get(key);
  if (memCached) {
    if (currentPayloadHash && memCached.payloadHash && memCached.payloadHash !== currentPayloadHash) {
      return {
        isIdempotentReplay: false,
        statusCode: 422,
        body: {
          error: "Idempotency key payload mismatch",
          details: "Yêu cầu này sử dụng lại Idempotency-Key nhưng có nội dung đơn hàng khác với yêu cầu trước đó.",
        },
      };
    }
    return {
      isIdempotentReplay: true,
      statusCode: memCached.statusCode,
      body: memCached.body,
    };
  }

  // 2. Kiểm tra In-flight lock cùng process
  if (inFlightRequests.has(key)) {
    const inFlightResult = await inFlightRequests.get(key);
    return {
      isIdempotentReplay: true,
      statusCode: inFlightResult.statusCode,
      body: inFlightResult.body,
    };
  }

  // 3. Khóa nguyên tử ở tầng cơ sở dữ liệu (Layer 2 - Multi-process Safe)
  const lockResult = await acquireDatabaseLock(key, currentPayloadHash);

  if (!lockResult.acquired) {
    if (lockResult.mismatch) {
      return {
        isIdempotentReplay: false,
        statusCode: 422,
        body: {
          error: "Idempotency key payload mismatch",
          details: "Yêu cầu này sử dụng lại Idempotency-Key nhưng có nội dung đơn hàng khác với yêu cầu trước đó.",
        },
      };
    }

    if (lockResult.completed) {
      memoryCache.set(key, {
        statusCode: lockResult.statusCode,
        body: lockResult.body,
        payloadHash: currentPayloadHash,
        createdAt: Date.now(),
      });
      return {
        isIdempotentReplay: true,
        statusCode: lockResult.statusCode,
        body: lockResult.body,
      };
    }

    if (lockResult.inFlight) {
      // Một process hoặc luồng khác đang xử lý -> Chờ trong tối đa 5 giây với backoff
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 300));
        const check = await getDbIdempotencyRecord(key);
        if (check && check.status === "COMPLETED") {
          return {
            isIdempotentReplay: true,
            statusCode: check.statusCode || 200,
            body: check.responseBody,
          };
        }
      }
      return {
        isIdempotentReplay: false,
        statusCode: 409,
        body: {
          error: "Order processing in progress",
          details: "Giao dịch với mã yêu cầu này đang được xử lý trong hệ thống. Vui lòng không gửi lại liên tục.",
        },
      };
    }
  }

  // 4. Khởi tạo Promise lock cho process hiện tại
  let resolvePromise;
  let rejectPromise;
  const inFlightPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  inFlightRequests.set(key, inFlightPromise);

  try {
    const result = await handlerFn();
    const orderId = result?.body?.id || result?.body?.orderCode || null;

    // Lưu trạng thái hoàn tất vào Database (Source of Truth)
    await setDbIdempotencyCompleted(key, result.statusCode, result.body, orderId);

    // Lưu Layer 1 Memory cache
    memoryCache.set(key, {
      statusCode: result.statusCode,
      body: result.body,
      payloadHash: currentPayloadHash,
      createdAt: Date.now(),
    });

    resolvePromise(result);
    return result;
  } catch (error) {
    // Đánh dấu FAILED trên DB để cho phép retry an toàn
    await setDbIdempotencyFailed(key);
    rejectPromise(error);
    throw error;
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Xóa các bản ghi Idempotency đã hết hạn (chỉ xóa COMPLETED hoặc FAILED, không xóa PROCESSING)
 */
async function cleanupExpiredIdempotencyRecords() {
  await ensureIdempotencyTable();
  try {
    await prisma.$executeRawUnsafe(
      "DELETE FROM `idempotency_records` WHERE `expiresAt` < NOW(3) AND `status` IN ('COMPLETED', 'FAILED')"
    );
  } catch (err) {
    console.warn("[Idempotency] Could not clean expired records:", err.message);
  }
}

module.exports = {
  extractIdempotencyKey,
  executeWithIdempotency,
  computePayloadHash,
  getDbIdempotencyRecord,
  setDbIdempotencyCompleted,
  setDbIdempotencyFailed,
  cleanupExpiredIdempotencyRecords,
  ensureIdempotencyTable,
};
