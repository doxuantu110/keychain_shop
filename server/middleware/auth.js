const crypto = require("crypto");
const prisma = require("../utills/db");

/**
 * Timing-safe string comparison to protect against side-channel timing attacks
 */
function safeCompare(input, expected) {
  if (typeof input !== "string" || typeof expected !== "string") return false;
  const bufInput = Buffer.from(input, "utf8");
  const bufExpected = Buffer.from(expected, "utf8");
  if (bufInput.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufInput, bufExpected);
}

/**
 * Checks whether a candidate credential matches configured admin API keys
 * Enforces:
 * - Minimum 16 characters length
 * - Dynamic read from environment variables
 * - Fail closed if no key configured
 * - Timing-safe comparison
 */
function matchesAdminKey(candidate) {
  if (!candidate || typeof candidate !== "string" || candidate.trim().length < 16) {
    return false;
  }

  // Strictly forbidden fallback secrets
  if (candidate === "thuongmaidientu2026" || (process.env.NEXTAUTH_SECRET && candidate === process.env.NEXTAUTH_SECRET)) {
    return false;
  }

  const validKeys = [
    process.env.ADMIN_API_KEY,
    process.env.INTERNAL_API_SECRET,
  ].filter((k) => Boolean(k) && typeof k === "string" && k.trim().length >= 16);

  if (validKeys.length === 0) {
    return false; // Fail closed: no keys configured
  }

  return validKeys.some((k) => safeCompare(candidate.trim(), k.trim()));
}

/**
 * Helper to check whether a request carries valid Admin credentials
 */
async function checkIsAdmin(req) {
  // 1. Check custom header x-admin-key / x-admin-token
  const adminKey = req.headers["x-admin-key"] || req.headers["x-admin-token"];
  if (matchesAdminKey(adminKey)) {
    return true;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (matchesAdminKey(token)) {
      return true;
    }
  }

  // 3. User verification: Only trust x-user-email / x-user-id if accompanied by valid internal secret
  const internalSecret = req.headers["x-internal-secret"] || req.headers["x-admin-key"];
  if (matchesAdminKey(internalSecret)) {
    const userEmail = req.headers["x-user-email"];
    const userId = req.headers["x-user-id"];

    if (userEmail || userId) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              userEmail ? { email: userEmail } : undefined,
              userId ? { id: userId } : undefined,
            ].filter(Boolean)
          }
        });

        if (user && (user.role === "admin" || user.role === "ADMIN")) {
          req.user = user;
          return true;
        }
      } catch (err) {
        console.error("Error verifying admin user in DB:", err);
      }
    }
  }

  return false;
}

/**
 * Middleware: Bắt buộc quyền Admin
 * Chặn các request không có token/key admin hợp lệ
 */
const requireAdmin = async (req, res, next) => {
  const isAdmin = await checkIsAdmin(req);
  if (isAdmin) {
    req.isAdmin = true;
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized",
    details: "Yêu cầu quyền quản trị viên (Admin) để thực hiện thao tác này."
  });
};

/**
 * Middleware: Tùy chọn xác thực
 * Gắn cờ req.isAdmin = true nếu có token admin, ngược lại req.isAdmin = false
 */
const optionalAuth = async (req, res, next) => {
  req.isAdmin = await checkIsAdmin(req);
  next();
};

module.exports = {
  checkIsAdmin,
  requireAdmin,
  optionalAuth,
};

