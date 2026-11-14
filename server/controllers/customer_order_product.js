const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

const createOrderProduct = asyncHandler(async (request, response) => {
  const { 
    customerOrderId, 
    productId, 
    variantId, 
    quantity,
    customText,
    customFont,
    customQrUrl
  } = request.body;
  
  // Validate required fields
  if (!customerOrderId) {
    throw new AppError("Customer order ID is required", 400);
  }
  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }
  const qty = parseInt(quantity, 10);
  if (!qty || qty <= 0) {
    throw new AppError("Valid quantity is required", 400);
  }

  // Verify that the customer order exists
  const existingOrder = await prisma.customer_order.findUnique({
    where: { id: customerOrderId }
  });

  if (!existingOrder) {
    throw new AppError("Customer order not found", 404);
  }

  // Verify that the product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { where: { isActive: true } }
    }
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  let variant = null;
  if (variantId) {
    variant = existingProduct.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new AppError("Variant not found or inactive", 404);
    }
  } else if (existingProduct.variants.length > 0) {
    variant = existingProduct.variants.sort((a, b) => a.price - b.price)[0];
  }

  if (variant && !variant.allowPreorder && variant.stock < qty) {
    throw new AppError(`Sản phẩm chỉ còn ${variant.stock} tồn kho`, 400);
  }

  // Atomic creation and stock deduction
  const orderProduct = await prisma.$transaction(async (tx) => {
    if (variant && !variant.allowPreorder) {
      const updateResult = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: qty } },
        data: { stock: { decrement: qty } }
      });
      if (updateResult.count === 0) {
        throw new AppError("Sản phẩm đã hết hàng trong quá trình xử lý", 400);
      }
    }

    const created = await tx.customer_order_product.create({
      data: {
        customerOrderId: customerOrderId,
        productId: productId,
        variantId: variant ? variant.id : null,
        quantity: qty,
        unitPrice: variant ? variant.price : existingProduct.price,
        productTitle: existingProduct.title,
        sizeLabel: variant ? variant.sizeLabel : null,
        customText: customText || null,
        customFont: customFont || null,
        customQrUrl: customQrUrl || null,
        isEstimatedSnapshot: false,
        snapshotSource: "CHECKOUT",
      }
    });

    // Sync product inStock
    const remaining = await tx.productVariant.findFirst({
      where: {
        productId: productId,
        isActive: true,
        OR: [{ stock: { gt: 0 } }, { allowPreorder: true }]
      }
    });
    await tx.product.update({
      where: { id: productId },
      data: { inStock: remaining ? 1 : 0 }
    });

    return created;
  });

  return response.status(201).json(orderProduct);
});

const updateProductOrder = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { customerOrderId, productId, quantity } = request.body;

  if (!id) {
    throw new AppError("Order product ID is required", 400);
  }

  const existingOrder = await prisma.customer_order_product.findUnique({
    where: {
      id: id
    }
  });

  if (!existingOrder) {
    throw new AppError("Order product not found", 404);
  }

  // Validate quantity if provided
  if (quantity !== undefined && quantity <= 0) {
    throw new AppError("Quantity must be greater than 0", 400);
  }

  const updatedOrder = await prisma.customer_order_product.update({
    where: {
      id: existingOrder.id
    },
    data: {
      customerOrderId: customerOrderId || existingOrder.customerOrderId,
      productId: productId || existingOrder.productId,
      quantity: quantity !== undefined ? quantity : existingOrder.quantity
    }
  });

  return response.json(updatedOrder);
});

const deleteProductOrder = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("Order product ID is required", 400);
  }

  const existingOrder = await prisma.customer_order_product.findUnique({
    where: { id }
  });

  if (!existingOrder) {
    throw new AppError("Order product not found", 404);
  }

  await prisma.customer_order_product.deleteMany({
    where: {
      customerOrderId: id
    }
  });
  return response.status(204).send();
});

const getProductOrder = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("Order ID is required", 400);
  }

  const order = await prisma.customer_order_product.findMany({
    where: {
      customerOrderId: id
    },
    include: {
      product: true
    }
  });
  
  if (!order || order.length === 0) {
    throw new AppError("Order not found", 404);
  }
  
  return response.status(200).json(order);
});

const getAllProductOrders = asyncHandler(async (request, response) => {
  const productOrders = await prisma.customer_order_product.findMany({
    select: {
      productId: true,
      quantity: true,
      customerOrder: {
        select: {
          id: true,
          name: true,
          lastname: true,
          phone: true,
          email: true,
          company: true,
          adress: true,
          apartment: true,
          postalCode: true,
          dateTime: true,
          status: true,
          total: true
        }
      }
    }
  });

  const ordersMap = new Map();

  for (const order of productOrders) {
    const { customerOrder, productId, quantity } = order;
    const { id, ...orderDetails } = customerOrder;

    const product = await prisma.product.findUnique({
      where: {
        id: productId
      },
      select: {
        id: true,
        title: true,
        mainImage: true,
        price: true,
        slug: true
      }
    });

    if (ordersMap.has(id)) {
      ordersMap.get(id).products.push({ ...product, quantity });
    } else {
      ordersMap.set(id, {
        customerOrderId: id,
        customerOrder: orderDetails,
        products: [{ ...product, quantity }]
      });
    }
  }

  const groupedOrders = Array.from(ordersMap.values());

  return response.json(groupedOrders);
});

module.exports = { 
  createOrderProduct, 
  updateProductOrder, 
  deleteProductOrder, 
  getProductOrder,
  getAllProductOrders
};