const prisma = require("../utills/db");
const { validateOrderData, ValidationError, calculateShippingFee } = require("../utills/validation");
const { createOrderUpdateNotification } = require("../utills/notificationHelpers");
const { extractIdempotencyKey, executeWithIdempotency } = require("../utills/idempotency");
const { checkIsAdmin } = require("../middleware/auth");
const emailService = require("../services/emailService");
const sepayService = require("../services/sepayService");

/**
 * Sinh mã đơn hàng chuẩn định dạng: MK-YYMMDD-XXXX (tránh O, 0, I, 1)
 */
function generateOrderCode(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MK-${yy}${mm}${dd}-${randomPart}`;
}

/**
 * Đồng bộ cờ Product.inStock dựa trên các biến thể còn hàng hoặc cho phép đặt trước
 */
async function syncProductInStock(tx, productId) {
  const activeVariantWithStock = await tx.productVariant.findFirst({
    where: {
      productId: productId,
      isActive: true,
      OR: [
        { stock: { gt: 0 } },
        { allowPreorder: true }
      ]
    }
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      inStock: activeVariantWithStock ? 1 : 0
    }
  });
}

/**
 * POST /api/orders
 * Tạo đơn hàng mới với:
 * - Idempotency Key bảo vệ race condition & timeout retry (Audit 6)
 * - Nguồn giá ProductVariant duy nhất từ DB, chống price tampering (Audit 3)
 * - Phí vận chuyển tập trung backend-controlled (Audit 3)
 * - Phân biệt tồn kho và Preorder A, B, C, D (Audit 2)
 * - Validate customization & items bắt buộc (Audit 5)
 */
async function createCustomerOrder(request, response) {
  const idempotencyKey = extractIdempotencyKey(request);

  try {
    const executionResult = await executeWithIdempotency(idempotencyKey, async () => {
      // 1. Validate dữ liệu đầu vào
      const validation = validateOrderData(request.body);
      if (!validation.isValid) {
        return {
          statusCode: 400,
          body: {
            error: "Validation failed",
            details: validation.errors,
          },
        };
      }

      const validatedData = validation.validatedData;

      // Audit 5: Bắt buộc items phải có ít nhất 1 sản phẩm
      if (!validatedData.items || validatedData.items.length === 0) {
        return {
          statusCode: 400,
          body: {
            error: "Validation failed",
            details: [{ field: "items", message: "Đơn hàng phải có ít nhất một sản phẩm (items không được rỗng)" }],
          },
        };
      }

      // 2. Chống spam nếu không có idempotencyKey (30 giây)
      if (!idempotencyKey) {
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        const duplicateOrder = await prisma.customer_order.findFirst({
          where: {
            email: validatedData.email,
            phone: validatedData.phone,
            createdAt: {
              gte: thirtySecondsAgo,
            },
          },
        });

        if (duplicateOrder) {
          return {
            statusCode: 409,
            body: {
              error: "Duplicate order detected",
              details: "Đơn hàng tương tự vừa được tạo. Vui lòng sử dụng Idempotency-Key hoặc chờ giây lát.",
            },
          };
        }
      }

      // 3. Xử lý & thẩm định giá, tồn kho, customization từng item
      let calculatedSubtotal = 0;
      const resolvedItems = [];

      for (let i = 0; i < validatedData.items.length; i++) {
        const item = validatedData.items[i];

        // Tìm sản phẩm
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: { where: { isActive: true } },
          },
        });

        if (!product || !product.isActive) {
          return {
            statusCode: 400,
            body: {
              error: "Product unavailable",
              details: `Sản phẩm (ID: ${item.productId}) không tồn tại hoặc đã ngừng kinh doanh`,
            },
          };
        }

        // Audit 5: Customization validation
        if (item.customText && item.customText.trim().length > 0) {
          if (!product.isCustomizable) {
            return {
              statusCode: 400,
              body: {
                error: "Customization not allowed",
                details: `Sản phẩm "${product.title}" không hỗ trợ khắc tên / tùy biến`,
              },
            };
          }

          if (item.customText.trim().length > product.maxCustomTextLength) {
            return {
              statusCode: 400,
              body: {
                error: "Custom text too long",
                details: `Nội dung khắc tên cho sản phẩm "${product.title}" vượt quá độ dài tối đa (${product.maxCustomTextLength} ký tự)`,
              },
            };
          }
        }

        // Audit 4 & 5: Variant validation - ProductVariant là nguồn duy nhất
        let variant = null;
        if (product.variants.length > 0) {
          if (!item.variantId) {
            return {
              statusCode: 400,
              body: {
                error: "Variant required",
                details: `Vui lòng chọn biến thể / kích thước cho sản phẩm "${product.title}"`,
              },
            };
          }

          variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            return {
              statusCode: 400,
              body: {
                error: "Variant unavailable",
                details: `Biến thể (ID: ${item.variantId}) không thuộc sản phẩm "${product.title}" hoặc đã ngưng hoạt động`,
              },
            };
          }
        }

        // Audit 2: Logic tồn kho & Preorder phân biệt A, B, C, D
        let shouldDeductStock = false;
        let snapshotSource = "CHECKOUT";

        if (variant) {
          if (variant.stock >= item.quantity) {
            // Trường hợp A: Đủ hàng thực tế -> Trừ kho
            shouldDeductStock = true;
            snapshotSource = "CHECKOUT";
          } else if (variant.allowPreorder) {
            // Trường hợp C & D: Không đủ hàng nhưng cho phép đặt trước -> Cho phép đặt, KHÔNG trừ kho âm
            shouldDeductStock = false;
            snapshotSource = "CHECKOUT_PREORDER";
          } else {
            // Trường hợp B: Không đủ hàng và allowPreorder = false -> TỪ CHỐI
            return {
              statusCode: 400,
              body: {
                error: "Insufficient stock",
                details: `Sản phẩm "${product.title}" (${variant.sizeLabel || "Mặc định"}) chỉ còn ${variant.stock} sản phẩm trong kho.`,
              },
            };
          }
        }

        // Audit 3: LẤY GIÁ TỪ DATABASE - TUYỆT ĐỐI KHÔNG TIN GIÁ TỪ CLIENT
        const unitPrice = variant ? variant.price : product.price;
        if (unitPrice <= 0) {
          return {
            statusCode: 400,
            body: {
              error: "Invalid price",
              details: `Biến thể sản phẩm "${product.title}" chưa có giá bán hợp lệ trong hệ thống`,
            },
          };
        }

        const itemSubtotal = unitPrice * item.quantity;
        calculatedSubtotal += itemSubtotal;

        resolvedItems.push({
          productId: product.id,
          variantId: variant ? variant.id : null,
          variant,
          quantity: item.quantity,
          unitPrice,
          productTitle: product.title,
          sizeLabel: variant ? variant.sizeLabel : null,
          customText: item.customText || null,
          customFont: item.customFont || null,
          customQrUrl: item.customQrUrl || null,
          shouldDeductStock,
          snapshotSource,
        });
      }

      // Audit 3: Shipping Fee được tính toán tập trung ở backend
      const shippingFee = calculateShippingFee(calculatedSubtotal);
      const finalTotal = calculatedSubtotal + shippingFee;

      // 4. Thực thi transaction nguyên tử trong Prisma
      const createdOrder = await prisma.$transaction(async (tx) => {
        // a. Trừ kho nguyên tử đối với các item đủ hàng
        for (const item of resolvedItems) {
          if (item.shouldDeductStock && item.variant) {
            const updateResult = await tx.productVariant.updateMany({
              where: {
                id: item.variant.id,
                stock: {
                  gte: item.quantity,
                },
              },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            if (updateResult.count === 0) {
              throw new Error(`Sản phẩm "${item.productTitle}" vừa hết hàng trong quá trình thanh toán`);
            }
          }
        }

        // b. Sinh mã đơn hàng duy nhất
        let orderCode = generateOrderCode();
        let exists = await tx.customer_order.findUnique({ where: { orderCode } });
        let attempts = 0;
        while (exists && attempts < 10) {
          orderCode = generateOrderCode();
          exists = await tx.customer_order.findUnique({ where: { orderCode } });
          attempts++;
        }

        // c. Tạo bản ghi Customer_order
        const order = await tx.customer_order.create({
          data: {
            orderCode,
            name: validatedData.name,
            lastname: validatedData.lastname,
            fullName: validatedData.fullName,
            phone: validatedData.phone,
            email: validatedData.email,
            province: validatedData.province,
            district: validatedData.district,
            ward: validatedData.ward,
            addressDetail: validatedData.addressDetail,
            company: validatedData.company,
            adress: validatedData.adress,
            apartment: validatedData.apartment,
            postalCode: validatedData.postalCode,
            city: validatedData.city,
            country: validatedData.country,
            subtotal: calculatedSubtotal,
            shippingFee,
            total: finalTotal,
            paymentMethod: validatedData.paymentMethod,
            paymentStatus: (validatedData.paymentMethod === "COD" || validatedData.paymentMethod === "SEPAY" || validatedData.paymentMethod === "SEPAY_QR") ? "PENDING" : validatedData.paymentStatus,
            status: (validatedData.paymentMethod === "SEPAY" || validatedData.paymentMethod === "SEPAY_QR") ? "PENDING_PAYMENT" : validatedData.status.toUpperCase(),
            orderNotice: validatedData.orderNotice,
            dateTime: new Date(),
          },
        });

        // d. Lưu các mặt hàng kèm Snapshot giá, tùy biến và nguồn trừ kho (CHECKOUT vs CHECKOUT_PREORDER)
        for (const item of resolvedItems) {
          await tx.customer_order_product.create({
            data: {
              customerOrderId: order.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              productTitle: item.productTitle,
              sizeLabel: item.sizeLabel,
              customText: item.customText,
              customFont: item.customFont,
              customQrUrl: item.customQrUrl,
              isEstimatedSnapshot: false,
              snapshotSource: item.snapshotSource,
            },
          });
        }

        // e. Khởi tạo lịch sử trạng thái OrderStatusHistory
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: order.status,
            note: "Đơn hàng được khởi tạo thành công",
            changedBy: request.body.userId || "CUSTOMER",
          },
        });

        // f. Khởi tạo bản ghi Payment cho đơn COD / SePay (status: PENDING, không tự động đánh dấu PAID)
        if (order.paymentMethod === "COD") {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: "COD",
              txnRef: `COD-${order.orderCode}`,
              amount: order.total,
              status: "PENDING",
            },
          });
        } else if (order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR") {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: "SEPAY",
              txnRef: `SEPAY-${order.orderCode}`,
              amount: order.total,
              status: "PENDING",
            },
          });
        }

        // g. Cập nhật lại cờ Product.inStock cho các sản phẩm liên quan
        const uniqueProductIds = [...new Set(resolvedItems.map((i) => i.productId))];
        for (const pId of uniqueProductIds) {
          await syncProductInStock(tx, pId);
        }

        // h. Atomic Transactional Outbox: Đưa bản ghi email vào outbox ngay trong cùng một Transaction với Đơn hàng
        const orderWithProducts = {
          ...order,
          products: resolvedItems,
        };
        await emailService.sendOrderConfirmation(orderWithProducts, tx);

        if (order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR") {
          await emailService.sendPaymentInstructions(orderWithProducts, null, tx);
        }

        return order;
      });

      // 5. Trigger outbox processing asynchronously post-commit
      emailService.processOutbox().catch((err) => {
        console.warn("[Email] Post-commit outbox trigger warning:", err.message);
      });

      // 6. Gửi thông báo cho User nếu có tài khoản
      try {
        let user = null;
        if (request.body.userId) {
          user = await prisma.user.findUnique({ where: { id: request.body.userId } });
        }
        if (!user) {
          user = await prisma.user.findUnique({ where: { email: validatedData.email } });
        }

        if (user) {
          await createOrderUpdateNotification(user.id, "confirmed", createdOrder.id, createdOrder.total);
        }
      } catch (notifErr) {
        console.warn("Notification skipped or error:", notifErr.message);
      }

      // 7. Sinh trước SePay Checkout Session nếu phương thức là SePay
      let checkoutSession = null;
      if (createdOrder.paymentMethod === "SEPAY" || createdOrder.paymentMethod === "SEPAY_QR") {
        try {
          checkoutSession = sepayService.createCheckoutSession({
            orderCode: createdOrder.orderCode,
            amount: createdOrder.total,
            description: `Thanh toan don hang ${createdOrder.orderCode}`,
          });
        } catch (sepayErr) {
          console.warn("[SePay] Failed to generate checkout session:", sepayErr.message);
        }
      }

      return {
        statusCode: 201,
        body: {
          id: createdOrder.id,
          orderCode: createdOrder.orderCode,
          subtotal: createdOrder.subtotal,
          shippingFee: createdOrder.shippingFee,
          total: createdOrder.total,
          status: createdOrder.status,
          paymentMethod: createdOrder.paymentMethod,
          paymentStatus: createdOrder.paymentStatus,
          checkoutSession,
          message: "Order created successfully",
        },
      };
    }, request.body);

    if (executionResult.isIdempotentReplay) {
      response.set("X-Idempotent-Replay", "true");
    }

    return response.status(executionResult.statusCode).json(executionResult.body);
  } catch (error) {
    console.error("❌ Error creating order:", error);

    if (error.code === "P2002") {
      return response.status(409).json({
        error: "Order conflict",
        details: "Mã đơn hàng hoặc thông tin bị trùng lặp, vui lòng thử lại.",
      });
    }

    if (error instanceof ValidationError) {
      return response.status(400).json({
        error: "Validation failed",
        details: [{ field: error.field, message: error.message }],
      });
    }

    return response.status(400).json({
      error: "Order creation failed",
      details: error.message || "Failed to create order.",
    });
  }
}

/**
 * GET /api/orders/:id
 * Lấy chi tiết đơn hàng:
 * - Admin có thể xem mọi đơn hàng.
 * - Khách hàng phải xác thực bằng email hoặc phone (Audit 4 - Customer order access protection).
 */
async function getCustomerOrder(request, response) {
  try {
    const { id } = request.params;

    if (!id || typeof id !== "string") {
      return response.status(400).json({
        error: "Invalid order ID or orderCode",
        details: "Order identifier must be provided",
      });
    }

    const order = await prisma.customer_order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderCode: id },
        ],
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                mainImage: true,
                arEnabled: true,
                glbUrl: true,
                usdzUrl: true,
              },
            },
            variant: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
        },
        payments: {
          select: {
            id: true,
            orderId: true,
            provider: true,
            txnRef: true,
            amount: true,
            status: true,
            bankCode: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return response.status(404).json({
        error: "Order not found",
        details: "Không tìm thấy đơn hàng với mã được yêu cầu",
      });
    }

    // Audit 4: Kiểm tra quyền truy cập đơn hàng
    const isAdmin = await checkIsAdmin(request);
    if (!isAdmin) {
      const verifyEmail = request.query.email || request.headers["x-user-email"];
      const verifyPhone = request.query.phone;

      const isOwner = (verifyEmail && verifyEmail.toLowerCase() === order.email.toLowerCase()) ||
                      (verifyPhone && verifyPhone === order.phone);

      if (!isOwner) {
        return response.status(403).json({
          error: "Access denied",
          details: "Vui lòng cung cấp email hoặc số điện thoại đặt hàng (qua query ?email=... hoặc ?phone=...) để tra cứu đơn hàng.",
        });
      }
    }

    return response.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return response.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch order.",
    });
  }
}

/**
 * POST /api/orders/lookup
 * Tra cứu đơn hàng an toàn qua HTTP POST body (Audit 3 & Phase 3.5).
 * - Không để lộ email/SĐT trên URL query string, browser history hay access log.
 * - Loại bỏ thông tin nhạy cảm (payments.rawResponse).
 * - Trả về lỗi 404 thống nhất để chống bruteforce enumeration.
 */
async function lookupCustomerOrder(request, response) {
  try {
    const { orderCode, email, phone } = request.body || {};

    if (!orderCode || typeof orderCode !== "string" || !orderCode.trim()) {
      return response.status(400).json({
        error: "Missing orderCode",
        details: "Vui lòng cung cấp mã đơn hàng để tra cứu.",
      });
    }

    if ((!email || !email.trim()) && (!phone || !phone.trim())) {
      return response.status(400).json({
        error: "Missing verification",
        details: "Vui lòng cung cấp số điện thoại hoặc email đặt hàng để xác thực.",
      });
    }

    const cleanCode = orderCode.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : null;

    const order = await prisma.customer_order.findFirst({
      where: {
        OR: [{ id: cleanCode }, { orderCode: cleanCode }],
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                mainImage: true,
                arEnabled: true,
                glbUrl: true,
                usdzUrl: true,
              },
            },
            variant: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
        },
        payments: {
          select: {
            id: true,
            orderId: true,
            provider: true,
            txnRef: true,
            amount: true,
            status: true,
            bankCode: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return response.status(404).json({
        error: "Order not found",
        details: "Không tìm thấy đơn hàng hoặc thông tin xác thực (email / số điện thoại) không khớp.",
      });
    }

    // Verify ownership
    const isOwner = (cleanEmail && cleanEmail === order.email.toLowerCase()) ||
                    (cleanPhone && cleanPhone === order.phone);

    if (!isOwner) {
      // Return uniform 404 to prevent enumeration between existing vs non-existing order codes
      return response.status(404).json({
        error: "Order not found",
        details: "Không tìm thấy đơn hàng hoặc thông tin xác thực (email / số điện thoại) không khớp.",
      });
    }

    return response.status(200).json(order);
  } catch (error) {
    console.error("Error looking up order:", error);
    return response.status(500).json({
      error: "Internal server error",
      details: "Failed to lookup order.",
    });
  }
}

/**
 * GET /api/orders
 * Lấy danh sách đơn hàng cho Admin với tìm kiếm, lọc trạng thái và phân trang (Audit 4: Admin Only)
 */
async function getAllOrders(request, response) {
  try {
    const isAdmin = await checkIsAdmin(request);
    if (!isAdmin) {
      return response.status(401).json({
        error: "Unauthorized",
        details: "Yêu cầu quyền quản trị viên (Admin) để xem danh sách đơn hàng",
      });
    }

    const page = parseInt(request.query.page, 10) || 1;
    const limit = parseInt(request.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { status, paymentStatus, query } = request.query;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus.toUpperCase();
    }
    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { orderCode: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { name: { contains: q } },
        { lastname: { contains: q } },
        { fullName: { contains: q } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.customer_order.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  mainImage: true,
                  slug: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  sizeLabel: true,
                  sku: true,
                  price: true,
                },
              },
            },
          },
          payments: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          statusHistory: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.customer_order.count({ where }),
    ]);

    return response.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return response.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch orders.",
    });
  }
}

const VALID_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

function isValidStatusTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * PUT /api/orders/:id
 * Cập nhật trạng thái đơn hàng (Audit 4: Admin Only).
 * Audit 1: Stock Restoration Idempotent & Chống race-condition khi hủy đơn:
 * - Chỉ hoàn kho khi đơn chuyển từ trạng thái CHƯA HỦY sang CANCELLED.
 * - Sử dụng updateMany atomic filter để đảm bảo nếu 2 request hủy cùng lúc, chỉ 1 request duy nhất thắng và hoàn kho.
 * - Không hoàn kho lại cho đơn đã ở trạng thái CANCELLED.
 * - Audit 2: Chỉ hoàn kho cho các item có snapshotSource !== 'CHECKOUT_PREORDER'.
 */
async function updateCustomerOrder(request, response) {
  try {
    const isAdmin = await checkIsAdmin(request);
    if (!isAdmin) {
      return response.status(401).json({
        error: "Unauthorized",
        details: "Yêu cầu quyền quản trị viên (Admin) để cập nhật trạng thái đơn hàng",
      });
    }

    const { id } = request.params;
    const { status, paymentStatus, orderNotice, note, changedBy } = request.body;

    if (!id || typeof id !== "string") {
      return response.status(400).json({
        error: "Invalid order ID",
        details: "Order ID must be provided",
      });
    }

    const existingOrder = await prisma.customer_order.findFirst({
      where: {
        OR: [{ id }, { orderCode: id }],
      },
      include: {
        products: true,
      },
    });

    if (!existingOrder) {
      return response.status(404).json({
        error: "Order not found",
        details: "Đơn hàng không tồn tại",
      });
    }

    const newStatus = status ? status.toUpperCase() : existingOrder.status;

    // Phase 3.6 - Audit 4: Kiểm tra ma trận chuyển trạng thái hợp lệ (State Machine Enforcement)
    if (!isValidStatusTransition(existingOrder.status, newStatus)) {
      return response.status(400).json({
        error: "Invalid status transition",
        details: `Không thể chuyển trạng thái đơn hàng từ "${existingOrder.status}" sang "${newStatus}". Các trạng thái hợp lệ tiếp theo: ${VALID_STATUS_TRANSITIONS[existingOrder.status]?.join(', ') || 'Không có (đơn hàng đã kết thúc)'}.`,
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // XỬ LÝ HỦY ĐƠN VÀ HOÀN KHO NGUYÊN TỬ (Audit 1 & Audit 2)
      if (newStatus === "CANCELLED") {
        // Atomic conditional update: chỉ cập nhật nếu trạng thái hiện tại KHÔNG PHẢI CANCELLED/DELIVERED
        const cancelResult = await tx.customer_order.updateMany({
          where: {
            id: existingOrder.id,
            status: { notIn: ["CANCELLED", "DELIVERED"] },
          },
          data: {
            status: "CANCELLED",
            ...(paymentStatus ? { paymentStatus: paymentStatus.toUpperCase() } : {}),
            ...(orderNotice !== undefined ? { orderNotice } : {}),
          },
        });

        if (cancelResult.count === 0) {
          // Đơn hàng đã là CANCELLED (hoặc do request hủy trước đó/đồng thời đã thắng)
          // TUYỆT ĐỐI KHÔNG HOÀN KHO LẦN 2!
          return await tx.customer_order.findUnique({
            where: { id: existingOrder.id },
            include: { statusHistory: { orderBy: { createdAt: "asc" } }, payments: true },
          });
        }

        // Request này thắng race condition! Thực hiện hoàn kho:
        for (const item of existingOrder.products) {
          // Audit 2: Chỉ hoàn kho nếu item thực sự đã trừ kho (không phải CHECKOUT_PREORDER)
          if (item.variantId && item.snapshotSource !== "CHECKOUT_PREORDER") {
            const variantExists = await tx.productVariant.findUnique({ where: { id: item.variantId } });
            if (variantExists) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stock: {
                    increment: item.quantity,
                  },
                },
              });
              await syncProductInStock(tx, item.productId);
            }
          }
        }

        // Ghi OrderStatusHistory
        await tx.orderStatusHistory.create({
          data: {
            orderId: existingOrder.id,
            fromStatus: existingOrder.status,
            toStatus: "CANCELLED",
            note: note || "Đơn hàng đã bị hủy và tồn kho thực tế đã được hoàn lại",
            changedBy: changedBy || "ADMIN",
          },
        });

        return await tx.customer_order.findUnique({
          where: { id: existingOrder.id },
          include: { statusHistory: { orderBy: { createdAt: "asc" } }, payments: true },
        });
      }

      // XỬ LÝ CÁC TRẠNG THÁI KHÁC (CONFIRMED, PROCESSING, SHIPPED, DELIVERED...)
      if (existingOrder.status !== newStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: existingOrder.id,
            fromStatus: existingOrder.status,
            toStatus: newStatus,
            note: note || `Cập nhật trạng thái sang ${newStatus}`,
            changedBy: changedBy || "ADMIN",
          },
        });
      }

      const updateData = { status: newStatus };
      // Security: Do NOT allow arbitrarily marking paymentStatus = PAID via general order update
      // Payment status can only be set to PAID via verified Gateway IPN or upon COD delivery completion
      if (paymentStatus && paymentStatus.toUpperCase() !== "PAID") {
        updateData.paymentStatus = paymentStatus.toUpperCase();
      }
      if (orderNotice !== undefined) updateData.orderNotice = orderNotice;

      // Khi giao hàng thành công (DELIVERED), nếu là COD thì cập nhật trạng thái thanh toán sang PAID
      if (newStatus === "DELIVERED" && existingOrder.paymentMethod === "COD" && existingOrder.paymentStatus !== "PAID") {
        updateData.paymentStatus = "PAID";
        await tx.payment.updateMany({
          where: {
            orderId: existingOrder.id,
            provider: "COD",
            status: "PENDING",
          },
          data: {
            status: "SUCCESS",
          },
        });
      }

      return await tx.customer_order.update({
        where: { id: existingOrder.id },
        data: updateData,
        include: { statusHistory: { orderBy: { createdAt: "asc" } }, payments: true },
      });
    });

    // Gửi email cập nhật tiến độ đơn hàng và notification nếu trạng thái thay đổi
    if (existingOrder.status !== newStatus) {
      try {
        emailService.sendOrderStatusUpdate(updatedOrder, newStatus, note).catch((err) => {
          console.warn("[Email] Order status update email failed:", err.message);
        });
      } catch (err) {
        console.warn("[Email] Status update email trigger error:", err.message);
      }

      try {
        const user = await prisma.user.findUnique({ where: { email: existingOrder.email } });
        if (user) {
          await createOrderUpdateNotification(user.id, newStatus.toLowerCase(), updatedOrder.id, updatedOrder.total);
        }
      } catch (e) {
        console.warn("Notification skipped:", e.message);
      }
    }

    return response.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return response.status(500).json({
      error: "Internal server error",
      details: error.message || "Failed to update order.",
    });
  }
}

/**
 * DELETE /api/orders/:id
 * Luôn từ chối xóa cứng đơn hàng để bảo vệ giao dịch tài chính và lịch sử đơn hàng (Audit 4).
 */
async function deleteCustomerOrder(request, response) {
  return response.status(400).json({
    error: "Order deletion is disabled",
    details: "Để bảo toàn đối soát tài chính và lịch sử đơn hàng, không được phép xóa cứng đơn hàng. Vui lòng chuyển trạng thái đơn hàng sang 'CANCELLED' để hủy đơn.",
  });
}

module.exports = {
  createCustomerOrder,
  updateCustomerOrder,
  deleteCustomerOrder,
  getCustomerOrder,
  getAllOrders,
  lookupCustomerOrder,
};
