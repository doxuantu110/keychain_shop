const prisma = require("../utills/db"); // ✅ Use shared connection with SSL
const { asyncHandler, handleServerError, AppError } = require("../utills/errorHandler");
const { checkIsAdmin } = require("../middleware/auth");

// Security: Define whitelists for allowed filter types and operators
const ALLOWED_FILTER_TYPES = ['price', 'rating', 'category', 'inStock', 'outOfStock'];
const ALLOWED_OPERATORS = ['gte', 'lte', 'gt', 'lt', 'equals', 'contains'];
const ALLOWED_SORT_VALUES = ['defaultSort', 'titleAsc', 'titleDesc', 'lowPrice', 'highPrice'];

// Security: Input validation functions
function validateFilterType(filterType) {
  return ALLOWED_FILTER_TYPES.includes(filterType);
}

function validateOperator(operator) {
  return ALLOWED_OPERATORS.includes(operator);
}

function validateSortValue(sortValue) {
  return ALLOWED_SORT_VALUES.includes(sortValue);
}

function validateAndSanitizeFilterValue(filterType, filterValue) {
  switch (filterType) {
    case 'price':
    case 'rating':
    case 'inStock':
    case 'outOfStock':
      const numValue = parseInt(filterValue);
      return isNaN(numValue) ? null : numValue;
    case 'category':
      return typeof filterValue === 'string' && filterValue.trim().length > 0 
        ? filterValue.trim() 
        : null;
    default:
      return null;
  }
}

// Security: Safe filter object builder
function buildSafeFilterObject(filterArray) {
  const filterObj = {};
  
  for (const item of filterArray) {
    // Validate filter type
    if (!validateFilterType(item.filterType)) {
      console.warn(`Invalid filter type: ${item.filterType}`);
      continue;
    }
    
    // Validate operator
    if (!validateOperator(item.filterOperator)) {
      console.warn(`Invalid operator: ${item.filterOperator}`);
      continue;
    }
    
    // Validate and sanitize filter value
    const sanitizedValue = validateAndSanitizeFilterValue(item.filterType, item.filterValue);
    if (sanitizedValue === null) {
      console.warn(`Invalid filter value for ${item.filterType}: ${item.filterValue}`);
      continue;
    }
    
    // Build safe filter object
    filterObj[item.filterType] = {
      [item.filterOperator]: sanitizedValue,
    };
  }
  
  return filterObj;
}

const getAllProducts = asyncHandler(async (request, response) => {
  const mode = request.query.mode || "";
  
  // Audit 4: Bắt buộc xác thực quyền Admin khi mode=admin, không coi query parameter là cơ chế xác thực
  if(mode === "admin"){
    const isAdmin = await checkIsAdmin(request);
    if (!isAdmin) {
      return response.status(401).json({
        error: "Unauthorized",
        details: "Yêu cầu quyền quản trị viên (Admin) để truy cập danh sách sản phẩm quản trị"
      });
    }

    const adminProducts = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          orderBy: { price: "asc" },
        },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return response.json(adminProducts);
  } else {
    const dividerLocation = request.url.indexOf("?");
    let filterObj = {};
    let sortObj = {};
    let sortByValue = "defaultSort";

    // getting current page with validation
    const page = Number(request.query.page);
    const validatedPage = (page && page > 0) ? page : 1;

    if (dividerLocation !== -1) {
      const queryArray = request.url
        .substring(dividerLocation + 1, request.url.length)
        .split("&");

      let filterType;
      let filterArray = [];

      for (let i = 0; i < queryArray.length; i++) {
        // Security: Use more robust parsing with validation
        const queryParam = queryArray[i];
        
        // Extract filter type safely
        if (queryParam.includes("filters")) {
          if (queryParam.includes("price")) {
            filterType = "price";
          } else if (queryParam.includes("rating")) {
            filterType = "rating";
          } else if (queryParam.includes("category")) {
            filterType = "category";
          } else if (queryParam.includes("inStock")) {
            filterType = "inStock";
          } else if (queryParam.includes("outOfStock")) {
            filterType = "outOfStock";
          } else {
            // Skip unknown filter types
            continue;
          }
        }

        if (queryParam.includes("sort")) {
          // Security: Validate sort value
          const extractedSortValue = queryParam.substring(queryParam.indexOf("=") + 1);
          if (validateSortValue(extractedSortValue)) {
            sortByValue = extractedSortValue;
          }
        }

        // Security: Extract filter parameters safely
        if (queryParam.includes("filters") && filterType) {
          let filterValue;
          
          // Extract filter value based on type
          if (filterType === "category") {
            filterValue = queryParam.substring(queryParam.indexOf("=") + 1);
          } else {
            const numValue = parseInt(queryParam.substring(queryParam.indexOf("=") + 1));
            filterValue = isNaN(numValue) ? null : numValue;
          }

          // Extract operator safely
          const operatorStart = queryParam.indexOf("$") + 1;
          const operatorEnd = queryParam.indexOf("=") - 1;
          
          if (operatorStart > 0 && operatorEnd > operatorStart) {
            const filterOperator = queryParam.substring(operatorStart, operatorEnd);
            
            // Only add to filter array if all values are valid
            if (filterValue !== null && filterOperator) {
              filterArray.push({ 
                filterType, 
                filterOperator, 
                filterValue 
              });
            }
          }
        }
      }
      
      // Security: Build filter object using safe function
      filterObj = buildSafeFilterObject(filterArray);
    }

    let whereClause = { ...filterObj };
    // Enforce isActive = true for public storefront queries
    whereClause.isActive = true;

    // Security: Handle category filter separately with validation
    if (filterObj.category && filterObj.category.equals) {
      delete whereClause.category;
    }

    // Security: Build sort object safely
    switch (sortByValue) {
      case "defaultSort":
        sortObj = {};
        break;
      case "titleAsc":
        sortObj = { title: "asc" };
        break;
      case "titleDesc":
        sortObj = { title: "desc" };
        break;
      case "lowPrice":
        sortObj = { price: "asc" };
        break;
      case "highPrice":
        sortObj = { price: "desc" };
        break;
      default:
        sortObj = {};
    }

    const defaultInclude = {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
      },
      images: true,
    };

    let products;

    if (Object.keys(filterObj).length === 0) {
      products = await prisma.product.findMany({
        skip: (validatedPage - 1) * 10,
        take: 12,
        where: whereClause,
        include: defaultInclude,
        orderBy: sortObj,
      });
    } else {
      // Security: Handle category filter with proper validation
      if (filterObj.category && filterObj.category.equals) {
        products = await prisma.product.findMany({
          skip: (validatedPage - 1) * 10,
          take: 12,
          include: defaultInclude,
          where: {
            ...whereClause,
            category: {
              name: {
                equals: filterObj.category.equals,
              },
            },
          },
          orderBy: sortObj,
        });
      } else {
        products = await prisma.product.findMany({
          skip: (validatedPage - 1) * 10,
          take: 12,
          include: defaultInclude,
          where: whereClause,
          orderBy: sortObj,
        });
      }
    }

    return response.json(products);
  }
});

const getAllProductsOld = asyncHandler(async (request, response) => {
  const products = await prisma.product.findMany({
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  response.status(200).json(products);
});

const createProduct = asyncHandler(async (request, response) => {
  const isAdmin = await checkIsAdmin(request);
  if (!isAdmin) {
    throw new AppError("Yêu cầu quyền quản trị viên (Admin) để tạo sản phẩm mới", 401);
  }

  const {
    merchantId,
    slug,
    title,
    mainImage,
    price,
    description,
    manufacturer,
    categoryId,
    inStock,
    isCustomizable,
    maxCustomTextLength,
    arEnabled,
    glbUrl,
    usdzUrl,
    shopeeUrl,
    tiktokUrl,
    isActive,
  } = request.body;

  if (!title) {
    throw new AppError("Missing required field: title", 400);
  }
  
  // Basic validation
  if (!merchantId) {
    throw new AppError("Missing required field: merchantId", 400);
  }
  
  if (!slug) {
    throw new AppError("Missing required field: slug", 400);
  }

  if (price === undefined || price === null) {
    throw new AppError("Missing required field: price", 400);
  }

  if (!categoryId) {
    throw new AppError("Missing required field: categoryId", 400);
  }

  const product = await prisma.product.create({
    data: {
      merchantId,
      slug,
      title,
      mainImage: mainImage || "",
      price: parseInt(price, 10) || 0,
      rating: 5,
      description: description || "",
      manufacturer: manufacturer || "Handmade",
      categoryId,
      inStock: inStock !== undefined ? inStock : 0,
      isCustomizable: isCustomizable !== undefined ? Boolean(isCustomizable) : true,
      maxCustomTextLength: maxCustomTextLength ? parseInt(maxCustomTextLength, 10) : 30,
      arEnabled: Boolean(arEnabled),
      glbUrl: glbUrl || null,
      usdzUrl: usdzUrl || null,
      shopeeUrl: shopeeUrl || null,
      tiktokUrl: tiktokUrl || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
  });
  return response.status(201).json(product);
});

// Method for updating existing product
const updateProduct = asyncHandler(async (request, response) => {
  const isAdmin = await checkIsAdmin(request);
  if (!isAdmin) {
    throw new AppError("Yêu cầu quyền quản trị viên (Admin) để cập nhật sản phẩm", 401);
  }

  const { id } = request.params;
  const {
    merchantId,
    slug,
    title,
    mainImage,
    price,
    rating,
    description,
    manufacturer,
    categoryId,
    inStock,
    isCustomizable,
    maxCustomTextLength,
    arEnabled,
    glbUrl,
    usdzUrl,
    shopeeUrl,
    tiktokUrl,
    isActive,
  } = request.body;

  // Basic validation
  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  // Finding a product by id
  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  // Updating found product
  const updateData = {};
  if (merchantId !== undefined) updateData.merchantId = merchantId;
  if (title !== undefined) updateData.title = title;
  if (mainImage !== undefined) updateData.mainImage = mainImage;
  if (slug !== undefined) updateData.slug = slug;
  if (price !== undefined) updateData.price = parseInt(price, 10);
  if (rating !== undefined) updateData.rating = rating;
  if (description !== undefined) updateData.description = description;
  if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (inStock !== undefined) updateData.inStock = inStock;
  if (isCustomizable !== undefined) updateData.isCustomizable = Boolean(isCustomizable);
  if (maxCustomTextLength !== undefined) updateData.maxCustomTextLength = parseInt(maxCustomTextLength, 10);
  if (arEnabled !== undefined) updateData.arEnabled = Boolean(arEnabled);
  if (glbUrl !== undefined) updateData.glbUrl = glbUrl;
  if (usdzUrl !== undefined) updateData.usdzUrl = usdzUrl;
  if (shopeeUrl !== undefined) updateData.shopeeUrl = shopeeUrl;
  if (tiktokUrl !== undefined) updateData.tiktokUrl = tiktokUrl;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const updatedProduct = await prisma.product.update({
    where: {
      id,
    },
    data: updateData,
  });

  return response.status(200).json(updatedProduct);
});

// Method for deleting a product
const deleteProduct = asyncHandler(async (request, response) => {
  const isAdmin = await checkIsAdmin(request);
  if (!isAdmin) {
    throw new AppError("Yêu cầu quyền quản trị viên (Admin) để xóa sản phẩm", 401);
  }

  const { id } = request.params;

  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  // Check for related records in order_product table
  const relatedOrderProductItems = await prisma.customer_order_product.findMany({
    where: {
      productId: id,
    },
  });
  
  if (relatedOrderProductItems.length > 0) {
    throw new AppError("Cannot delete product because it has associated customer orders. Set isActive to false instead.", 400);
  }

  await prisma.product.delete({
    where: {
      id,
    },
  });
  return response.status(204).send();
});

const searchProducts = asyncHandler(async (request, response) => {
  const { query } = request.query;
  
  if (!query) {
    throw new AppError("Query parameter is required", 400);
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        {
          title: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
      ],
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
      },
      images: true,
    },
  });

  return response.json(products);
});

const getProductById = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const mode = request.query.mode || "";
  
  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  const isAdmin = await checkIsAdmin(request);
  const isRequestedAdminMode = mode === "admin" && isAdmin;

  const product = await prisma.product.findUnique({
    where: {
      id: id,
    },
    include: {
      category: true,
      variants: {
        where: isRequestedAdminMode ? {} : { isActive: true },
        orderBy: { price: "asc" },
      },
      images: true,
    },
  });
  
  if (!product || (!isRequestedAdminMode && !product.isActive)) {
    throw new AppError("Product not found", 404);
  }
  
  return response.status(200).json(product);
});

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
};
