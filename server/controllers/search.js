const prisma = require("../utills/db");

async function searchProducts(request, response) {
  try {
    const { query } = request.query;
    if (!query) {
      return response.status(400).json({ error: "Query parameter is required" });
    }

    const page = parseInt(request.query.page, 10) || 1;
    const limit = parseInt(request.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const whereClause = {
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
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
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
        skip: skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Set pagination headers
    response.set("X-Total-Count", String(totalCount));
    response.set("X-Page", String(page));
    response.set("X-Total-Pages", String(Math.ceil(totalCount / limit)));

    // If client requested paginated object format explicitly
    if (request.query.format === "paginated") {
      return response.json({
        products,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    }

    // Default: return array for backward compatibility with frontend
    return response.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    return response.status(500).json({ error: "Error searching products" });
  }
}

module.exports = { searchProducts };
