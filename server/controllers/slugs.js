const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

/**
 * GET /api/slugs/:slug
 * Lấy thông tin chi tiết sản phẩm theo slug, chỉ trả về khi sản phẩm đang hoạt động (isActive = true).
 * Bao gồm category, active variants (sắp xếp giá tăng dần), và danh sách ảnh phụ.
 */
const getProductBySlug = asyncHandler(async (request, response) => {
  const { slug } = request.params;

  if (!slug) {
    throw new AppError("Slug is required", 400);
  }

  const product = await prisma.product.findUnique({
    where: {
      slug: slug,
    },
    include: {
      category: true,
      variants: {
        where: {
          isActive: true,
        },
        orderBy: {
          price: "asc",
        },
      },
      images: true,
    },
  });

  if (!product || !product.isActive) {
    throw new AppError("Product not found", 404);
  }

  return response.status(200).json(product);
});

module.exports = { getProductBySlug };
