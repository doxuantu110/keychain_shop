const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

/**
 * GET /api/variants/product/:productId
 * Lấy danh sách các biến thể đang hoạt động của sản phẩm
 */
const getVariantsByProductId = asyncHandler(async (request, response) => {
  const { productId } = request.params;

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  // Kiểm tra sản phẩm có tồn tại và đang hoạt động không
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, isActive: true }
  });

  if (!product || !product.isActive) {
    throw new AppError("Product not found or inactive", 404);
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      productId: productId,
      isActive: true,
    },
    orderBy: {
      price: "asc",
    },
  });

  return response.status(200).json(variants);
});

/**
 * GET /api/variants/:id
 * Lấy chi tiết một biến thể theo ID
 */
const getVariantById = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("Variant ID is required", 400);
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          mainImage: true,
          isActive: true,
          isCustomizable: true,
          maxCustomTextLength: true,
          arEnabled: true,
          glbUrl: true,
          usdzUrl: true,
        },
      },
    },
  });

  if (!variant || !variant.isActive || (variant.product && !variant.product.isActive)) {
    throw new AppError("Variant not found", 404);
  }

  return response.status(200).json(variant);
});

/**
 * POST /api/variants/check-stock
 * Kiểm tra tồn kho và tính khả dụng của một hoặc nhiều biến thể
 * Body hỗ trợ:
 * - { variantId: string, quantity: number }
 * - { items: [{ variantId: string, quantity: number }] }
 */
const checkVariantStock = asyncHandler(async (request, response) => {
  const { variantId, quantity, items } = request.body;

  let queryItems = [];

  if (Array.isArray(items) && items.length > 0) {
    queryItems = items;
  } else if (variantId) {
    queryItems = [{ variantId, quantity: quantity || 1 }];
  } else {
    throw new AppError("variantId or items array is required", 400);
  }

  const results = [];
  let allAvailable = true;

  for (const item of queryItems) {
    const vId = item.variantId;
    const qty = parseInt(item.quantity, 10) || 1;

    if (!vId) {
      results.push({
        variantId: null,
        available: false,
        reason: "Missing variantId"
      });
      allAvailable = false;
      continue;
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: vId },
      include: {
        product: {
          select: { id: true, title: true, isActive: true }
        }
      }
    });

    if (!variant || !variant.isActive || !variant.product?.isActive) {
      results.push({
        variantId: vId,
        available: false,
        reason: "Variant not found or inactive"
      });
      allAvailable = false;
      continue;
    }

    const isAvailable = variant.allowPreorder || variant.stock >= qty;
    if (!isAvailable) {
      allAvailable = false;
    }

    results.push({
      variantId: variant.id,
      productId: variant.productId,
      productTitle: variant.product.title,
      sizeLabel: variant.sizeLabel,
      price: variant.price,
      stock: variant.stock,
      allowPreorder: variant.allowPreorder,
      requestedQuantity: qty,
      available: isAvailable,
      reason: isAvailable ? "In stock" : `Only ${variant.stock} available in stock`
    });
  }

  return response.status(200).json({
    available: allAvailable,
    items: results
  });
});

module.exports = {
  getVariantsByProductId,
  getVariantById,
  checkVariantStock,
};

