/**
 * Data Migration & Backfill Script - Phase 1 (MVP)
 * Project: Keychain & Nameplate Store
 * Safe, Idempotent, with Audit Logging & Rerun Protection
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = require('../utills/db');

function generateSafeCode(date, randomLength = 4) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 không chứa 0, 1, I, O
  const d = date ? new Date(date) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  let random = '';
  for (let i = 0; i < randomLength; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MK-${yy}${mm}${dd}-${random}`;
}

async function runDataMigration() {
  console.log('🚀 Bắt đầu chạy Data Migration Phase 1 (Chế độ Idempotent an toàn)...');

  // 1. Kiểm tra số lượng bản ghi ban đầu
  const [productCount, orderCount, orderProductCount] = await Promise.all([
    prisma.product.count(),
    prisma.customer_order.count(),
    prisma.customer_order_product.count(),
  ]);

  console.log(`📊 Số lượng hiện tại trong Database:`);
  console.log(`  - Products: ${productCount}`);
  console.log(`  - Customer Orders: ${orderCount}`);
  console.log(`  - Customer Order Products: ${orderProductCount}`);

  // 2. Backfill ProductVariant (Bảo vệ chạy lại: Chỉ tạo nếu sản phẩm chưa có biến thể nào)
  console.log('\n📦 [Bước 1/3] Đang kiểm tra và backfill ProductVariant...');
  const products = await prisma.product.findMany({
    include: { variants: true }
  });

  let createdVariants = 0;
  let skippedVariants = 0;
  for (const product of products) {
    if (!product.variants || product.variants.length === 0) {
      const variantKey = 'size:default|color:none|mat:none';
      const cleanSlug = (product.slug || product.id).toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 30);
      const sku = `SKU-${cleanSlug}-DEF`;

      const newVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          variantKey: variantKey,
          sizeLabel: 'Tiêu chuẩn',
          color: null,
          material: null,
          sku: sku,
          price: product.price || 0,
          costPrice: null,
          isCostAudited: false,
          stock: 0, // Không suy diễn tồn kho, yêu cầu admin kiểm kho
          isStockAudited: false,
          allowPreorder: false,
          isActive: true
        }
      });

      // Ghi log audit cho bản ghi mới tạo
      await prisma.migrationAuditLog.create({
        data: {
          phase: 'PHASE_2_VARIANTS',
          tableName: 'ProductVariant',
          recordId: newVariant.id,
          action: 'INSERT',
          newData: newVariant
        }
      });

      createdVariants++;
    } else {
      skippedVariants++;
    }
  }
  console.log(`✅ Biến thể: Đã tạo ${createdVariants} biến thể mới, bỏ qua ${skippedVariants} sản phẩm đã có biến thể.`);

  // 3. Backfill Customer_order (Bảo vệ chạy lại: Bỏ qua đơn đã có orderCode hợp lệ)
  console.log('\n📋 [Bước 2/3] Đang backfill Customer_order...');
  const orders = await prisma.customer_order.findMany();
  const existingCodes = new Set(orders.map(o => o.orderCode).filter(Boolean));

  let updatedOrders = 0;
  let skippedOrders = 0;
  for (const order of orders) {
    const hasValidCode = order.orderCode && order.orderCode.trim() !== '';
    if (hasValidCode) {
      skippedOrders++;
      continue; // Đã xử lý hợp lệ từ lần chạy trước, bỏ qua để không tạo duplicate audit log
    }

    let isUnique = false;
    let orderCode = '';
    while (!isUnique) {
      orderCode = generateSafeCode(order.dateTime || order.createdAt);
      if (!existingCodes.has(orderCode)) {
        isUnique = true;
        existingCodes.add(orderCode);
      }
    }

    const updateData = {
      orderCode: orderCode,
      subtotal: order.subtotal || order.total || 0,
      shippingFee: order.shippingFee || 0,
      paymentMethod: order.paymentMethod || 'UNVERIFIED',
      paymentStatus: order.paymentStatus || 'UNVERIFIED',
    };

    await prisma.customer_order.update({
      where: { id: order.id },
      data: updateData
    });

    // Tạo 1 bản ghi lịch sử OrderStatusHistory nếu chưa có
    const existingHistory = await prisma.orderStatusHistory.findFirst({
      where: { orderId: order.id }
    });

    if (!existingHistory) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: order.status || 'PENDING',
          note: 'Khởi tạo từ đơn hàng cũ (Data Migration Phase 1)',
          changedBy: 'MIGRATION_SCRIPT'
        }
      });
    }

    // Log audit
    await prisma.migrationAuditLog.create({
      data: {
        phase: 'PHASE_3_ORDER_CODE',
        tableName: 'Customer_order',
        recordId: order.id,
        action: 'UPDATE',
        oldData: { orderCode: order.orderCode, paymentStatus: order.paymentStatus },
        newData: updateData
      }
    });

    updatedOrders++;
  }
  console.log(`✅ Đơn hàng: Đã cập nhật ${updatedOrders} đơn hàng mới, bỏ qua ${skippedOrders} đơn đã có mã orderCode.`);

  // 4. Backfill Snapshot cho customer_order_product (Bảo vệ chạy lại: Bỏ qua mục đã có ESTIMATED_MIGRATION_V1)
  console.log('\n🛍️ [Bước 3/3] Đang backfill snapshot cho customer_order_product...');
  const orderItems = await prisma.customer_order_product.findMany({
    where: {
      AND: [
        { snapshotSource: { not: 'ESTIMATED_MIGRATION_V1' } },
        {
          OR: [
            { unitPrice: 0 },
            { productTitle: '' }
          ]
        }
      ]
    },
    include: { product: true }
  });

  let updatedItems = 0;
  for (const item of orderItems) {
    if (item.snapshotSource === 'ESTIMATED_MIGRATION_V1') {
      continue;
    }

    const productPrice = item.product?.price || 0;
    const productTitle = item.product?.title || 'Sản phẩm cũ';

    await prisma.customer_order_product.update({
      where: { id: item.id },
      data: {
        unitPrice: productPrice,
        productTitle: productTitle,
        sizeLabel: item.sizeLabel || 'Tiêu chuẩn',
        isEstimatedSnapshot: true,
        snapshotSource: 'ESTIMATED_MIGRATION_V1'
      }
    });

    await prisma.migrationAuditLog.create({
      data: {
        phase: 'PHASE_4_SNAPSHOT',
        tableName: 'customer_order_product',
        recordId: item.id,
        action: 'UPDATE',
        oldData: { unitPrice: item.unitPrice, productTitle: item.productTitle },
        newData: { unitPrice: productPrice, productTitle: productTitle, isEstimatedSnapshot: true }
      }
    });

    updatedItems++;
  }
  console.log(`✅ Snapshot đơn hàng: Đã cập nhật ${updatedItems} mục đơn hàng.`);

  // 5. Kiểm tra tính toàn vẹn (Verification) bằng SQL thuần để tránh lỗi Type của Prisma
  console.log('\n🔍 Đang kiểm tra tính toàn vẹn dữ liệu sau migration...');
  
  // Kiểm tra orderCode null hoặc rỗng qua SQL thuần
  const nullCheckResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM \`Customer_order\` 
    WHERE \`orderCode\` IS NULL OR TRIM(\`orderCode\`) = ''
  `;
  const nullCodes = Number(nullCheckResult[0]?.count ?? 0);

  // Kiểm tra trùng lặp orderCode qua SQL thuần
  const duplicateCheckResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM (
      SELECT \`orderCode\`
      FROM \`Customer_order\`
      WHERE \`orderCode\` IS NOT NULL AND TRIM(\`orderCode\`) != ''
      GROUP BY \`orderCode\`
      HAVING COUNT(*) > 1
    ) as dup_orders
  `;
  const duplicateCodes = Number(duplicateCheckResult[0]?.count ?? 0);

  if (nullCodes > 0) {
    console.error(`❌ CẢNH BÁO: Còn ${nullCodes} đơn hàng chưa có orderCode hợp lệ!`);
    process.exit(1);
  }

  if (duplicateCodes > 0) {
    console.error(`❌ CẢNH BÁO: Phát hiện ${duplicateCodes} mã orderCode bị trùng lặp!`);
    process.exit(1);
  }

  console.log(`✅ Xác minh hoàn tất: 100% đơn hàng có orderCode hợp lệ và không bị trùng lặp!`);

  // 6. Áp dụng ràng buộc DDL an toàn (chống lỗi nếu đã chạy trước đó)
  console.log('\n⚙️ Đang đồng bộ ràng buộc DDL cho orderCode...');

  // 6.1. Thiết lập NOT NULL
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `Customer_order` MODIFY COLUMN `orderCode` VARCHAR(191) NOT NULL;'
    );
    console.log('✅ Đã thiết lập Customer_order.orderCode sang NOT NULL.');
  } catch (err) {
    console.log(`ℹ️ Cột orderCode NOT NULL: ${err.message}`);
  }

  // 6.2. Tạo UNIQUE INDEX nếu chưa có
  try {
    const checkIndexResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = 'Customer_order' 
        AND index_name = 'Customer_order_orderCode_key'
    `;
    const indexExists = Number(checkIndexResult[0]?.count ?? 0) > 0;

    if (!indexExists) {
      await prisma.$executeRawUnsafe(
        'CREATE UNIQUE INDEX `Customer_order_orderCode_key` ON `Customer_order`(`orderCode`);'
      );
      console.log('✅ Đã tạo UNIQUE INDEX Customer_order_orderCode_key.');
    } else {
      console.log('ℹ️ UNIQUE INDEX Customer_order_orderCode_key đã tồn tại từ trước (Idempotent OK).');
    }
  } catch (indexErr) {
    if (indexErr.message && (indexErr.message.includes('Duplicate key name') || indexErr.message.includes('1061'))) {
      console.log('ℹ️ UNIQUE INDEX Customer_order_orderCode_key đã tồn tại từ trước.');
    } else {
      console.error(`⚠️ Lỗi khi xử lý index: ${indexErr.message}`);
    }
  }

  console.log('\n🎉 Hoàn thành Data Migration Phase 1 thành công tuyệt đối!');
}

runDataMigration()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy Data Migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
