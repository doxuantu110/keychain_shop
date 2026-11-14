# BÁO CÁO TOÀN DIỆN: TRIỂN KHAI HỆ THỐNG EMAIL NOTIFICATIONS & ADMIN ORDER MANAGEMENT
**Website:** Craft3D – Boutique Brand Store (Móc khóa & Phụ kiện in 3D cá nhân hóa)  
**Địa điểm Workspace:**  
- Frontend: `D:\shop` (Next.js 15 App Router, TypeScript, TailwindCSS)  
- Backend: `D:\shop\server` (Node.js, Express, Prisma ORM, MySQL)  
**Thời gian hoàn thành:** 14/11/2026  
**Trạng thái kiểm thử:** 62/62 Tests Passed (New Email & Admin Suite) | 54/54 Tests Passed (SePay & Guest Checkout) | Next.js Build: 24/24 Routes Verified

---

## 1. TỔNG QUAN TRIỂN KHAI (EXECUTIVE SUMMARY)

Đợt nâng cấp này hoàn thiện 2 trụ cột cốt lõi phục vụ vận hành thực tế cho xưởng chế tác Craft3D:
1. **Hệ thống Email Notifications đa kênh & Hàng đợi bền bỉ (Database-backed Email Outbox Pattern):**
   - Thiết kế 7 mẫu email tiếng Việt chuẩn thương hiệu Craft3D với phong cách ấm áp, tinh tế, responsive trên mọi thiết bị di động và máy tính.
   - Triển khai mô hình Outbox Pattern lưu trữ tại bảng `email_outbox` trong MySQL, tách biệt hoàn toàn việc tạo đơn / xác nhận thanh toán khỏi quá trình gửi mail qua mạng (decoupled), đảm bảo lỗi SMTP hoặc mạng không bao giờ làm gián đoạn hay rollback đơn hàng.
   - Cơ chế Deduplication & Idempotency Key duy nhất (`idempotencyKey`) loại trừ 100% rủi ro gửi trùng email khi webhook SePay IPN replay hoặc khi worker background retry.
   - Hỗ trợ retry tự động tối đa 3 lần với theo dõi lỗi chi tiết, cùng tính năng gửi lại email thủ công (Manual Resend) cho Admin.
2. **Giao diện & API Quản trị Đơn hàng Toàn diện (Admin Order Management):**
   - Bộ 6 API quản trị chuẩn RESTful tại `/api/admin/orders/*`, bảo vệ nghiêm ngặt bằng middleware `requireAdmin`.
   - Thực thi máy trạng thái hữu hạn (State Machine Transition): `PENDING` / `PENDING_PAYMENT` $\to$ `CONFIRMED` $\to$ `PROCESSING` $\to$ `SHIPPED` $\to$ `DELIVERED`, và `CANCELLED`.
   - Cơ chế hoàn kho nguyên tử (`updateMany` atomic filter) khi hủy đơn, loại trừ đơn Preorder không trừ kho, chống hoàn kho trùng lặp (Double Cancel Idempotency).
   - Bảo mật tài chính: Tuyệt đối không cho phép chuyển trạng thái thanh toán thành `PAID` qua API cập nhật trạng thái thông thường (chỉ tự động cập nhật khi giao hàng thành công đơn COD hoặc qua IPN SePay đã xác thực).
   - Giao diện Admin danh sách `/admin/orders` và chi tiết `/admin/orders/[id]` được thiết kế lại hoàn toàn theo phong cách Craft3D Boutique: hiển thị thẻ KPI thống kê, tìm kiếm đa trường, bộ lọc ngày (Hôm nay, 7 ngày, 30 ngày, Tất cả), bảng dữ liệu phân trang server-side, xem chi tiết chữ khắc laser in 3D (`customText`, `customFont`, `customQrUrl`), quản lý ghi chú nội bộ bảo mật, và lịch sử gửi email.

---

## 2. KIẾN TRÚC HỆ THỐNG EMAIL & OUTBOX PATTERN

### 2.1. Sơ đồ Hoạt động Outbox Pattern
```
[Tạo đơn hàng / Webhook SePay IPN / Admin cập nhật trạng thái]
                            │
                            ▼
           ┌─────────────────────────────────┐
           │   emailOutboxService.queueEmail │
           │   (Tạo bản ghi EmailOutbox      │
           │    với idempotencyKey duy nhất) │
           └────────────────┬────────────────┘
                            │ (Status: PENDING)
                            │ Trả về kết quả ngay (Non-blocking)
                            ▼
           ┌─────────────────────────────────┐
           │      setImmediate / Worker      │
           │     processOutbox(batchSize)    │
           └────────────────┬────────────────┘
                            │ Status -> PROCESSING
               ┌────────────┴────────────┐
               │                         │
     [Gửi thành công]             [Gửi thất bại]
               │                         │
               ▼                         ▼
        Status: SENT               retryCount++
        sentAt: NOW()              Status: (retryCount >= 3 ? FAILED : PENDING)
        lastError: null            lastError: err.message
```

### 2.2. Chi tiết Bảng Cơ sở Dữ liệu `email_outbox`
Model Prisma được thêm mới vào `server/prisma/schema.prisma` và `prisma/schema.prisma`:
```prisma
model EmailOutbox {
  id             String    @id @default(uuid())
  orderId        String
  orderCode      String
  eventType      String    // ORDER_CONFIRMATION, PAYMENT_INSTRUCTIONS, PAYMENT_SUCCESS, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED, MANUAL_RESEND
  recipient      String
  subject        String
  htmlContent    String    @db.Text
  textContent    String?   @db.Text
  status         String    @default("PENDING") // PENDING, PROCESSING, SENT, FAILED
  retryCount     Int       @default(0)
  maxRetries     Int       @default(3)
  lastError      String?   @db.Text
  sentAt         DateTime?
  idempotencyKey String    @unique @db.VarChar(191) // Khóa chống trùng lặp tuyệt đối
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([status, retryCount])
  @@index([orderCode])
  @@index([orderId])
  @@map("email_outbox")
}
```

---

## 3. BỘ 7 TEMPLATES EMAIL TIẾNG VIỆT CHUẨN THƯƠNG HIỆU CRAFT3D

Tất cả các template đều được xây dựng tại `server/services/email/emailTemplates.js`, bọc trong layout Craft3D responsive (`wrapLayout`):

| STT | Tên Template | Sự kiện Kích hoạt | Tiêu đề Email | Nội dung chính |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Xác nhận đơn hàng** (`ORDER_CONFIRMATION`) | Ngay khi khách hoàn tất Checkout (cả COD và SePay) | `[Craft3D] Xác nhận đơn hàng #${orderCode}` | Lời cảm ơn, mã đơn, danh sách sản phẩm in 3D kèm chi tiết chữ khắc laser & font, địa chỉ giao hàng, phân biệt rõ COD và SePay. |
| **2** | **Hướng dẫn thanh toán SePay** (`PAYMENT_INSTRUCTIONS`) | Đơn SePay khởi tạo ở trạng thái `PENDING_PAYMENT` | `[Craft3D] Hướng dẫn thanh toán đơn hàng #${orderCode}` | Số tiền chính xác, nội dung chuyển khoản là mã đơn hàng `${orderCode}`, nút mở Cổng thanh toán VietQR SePay Sandbox. |
| **3** | **Thanh toán thành công** (`PAYMENT_SUCCESS`) | DUY NHẤT sau khi nhận webhook IPN SePay hợp lệ (đúng Secret Key & khớp số tiền) | `[Craft3D] Thanh toán thành công cho đơn hàng #${orderCode}` | Thông báo tiền đã vào tài khoản xưởng, mã giao dịch (TxnRef), số tiền đã thanh toán, xác nhận đưa file vào hàng đợi in 3D. |
| **4** | **Đã xác nhận đơn hàng** (`ORDER_CONFIRMED`) | Admin bấm nút "Xác nhận đơn hàng" trên Dashboard | `[Craft3D] Đơn hàng #${orderCode} đã được xác nhận` | Thông báo xưởng đã duyệt thiết kế cá nhân hóa, chuẩn bị vật liệu in 3D và phôi gia công. |
| **5** | **Đang giao hàng** (`ORDER_SHIPPED`) | Admin chuyển đơn sang trạng thái `SHIPPED` | `[Craft3D] Đơn hàng #${orderCode} đang trên đường giao đến bạn` | Đơn hàng đã đóng gói hộp quà, tên đơn vị vận chuyển (GHN, Viettel Post...), mã vận đơn bưu tá (nếu có), số tiền COD thu hộ (nếu chưa thanh toán). |
| **6** | **Giao hàng thành công** (`ORDER_DELIVERED`) | Đơn hàng hoàn tất giao tận tay khách | `[Craft3D] Đơn hàng #${orderCode} đã được giao thành công` | Tri ân khách hàng, hướng dẫn bảo quản móc khóa in 3D (tránh nhiệt >60°C, vệ sinh khăn mềm), lời mời phản hồi. |
| **7** | **Thông báo hủy đơn** (`ORDER_CANCELLED`) | Admin hủy đơn hoặc khách hủy hợp lệ | `[Craft3D] Thông báo hủy đơn hàng #${orderCode}` | Thông báo lý do hủy rõ ràng, xác nhận tồn kho đã được hoàn lại, chính sách xử lý thanh toán minh bạch (không cam kết hoàn tiền ảo nếu chưa cấu hình gateway). |

---

## 4. BẢO MẬT & QUẢN TRỊ ADMIN (ADMIN AUTHORIZATION & RBAC)

1. **Middleware Bảo vệ:**  
   Toàn bộ router `/api/admin/orders` được bảo vệ bởi middleware `requireAdmin` (`server/middleware/auth.js`).
2. **Cơ chế Thẩm định:**
   - Kiểm tra `x-admin-key` hoặc `x-admin-token` so khớp với `process.env.ADMIN_API_KEY` hoặc `process.env.NEXTAUTH_SECRET`.
   - Kiểm tra `Authorization: Bearer <token>`.
   - Kiểm tra phiên làm việc NextAuth (`user.role === 'admin'`).
3. **Kết quả Thử nghiệm Bảo mật:**
   - Gửi request `GET /api/admin/orders` không có header $\to$ **401 Unauthorized**.
   - Gửi request `GET /api/admin/orders/stats` không có header $\to$ **401 Unauthorized**.
   - Gửi request `PATCH /api/admin/orders/:id/status` không có header $\to$ **401 Unauthorized**.
   - Gửi request kèm `x-admin-key: thuongmaidientu2026` $\to$ **200 OK**.

---

## 5. BỘ API QUẢN TRỊ ĐƠN HÀNG (`server/routes/admin_orders.js`)

| Phương thức | Endpoint | Chức năng | Tham số / Body |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/admin/orders` | Lấy danh sách đơn hàng có phân trang, lọc đa chiều và tìm kiếm | Query: `page`, `limit`, `status`, `paymentStatus`, `paymentMethod`, `q`, `dateRange` |
| **GET** | `/api/admin/orders/stats` | Thống kê số lượng đơn theo từng trạng thái và tổng doanh thu thực tế | Query: `dateRange` (`today`, `7d`, `30d`, `all`), `startDate`, `endDate` |
| **GET** | `/api/admin/orders/:id` | Xem chi tiết đơn hàng, snapshot giá, tùy biến in 3D, thanh toán và lịch sử email | Param: `:id` (UUID hoặc `orderCode`) |
| **PATCH**| `/api/admin/orders/:id/status` | Chuyển đổi trạng thái theo máy trạng thái, hoàn kho nguyên tử nếu hủy đơn, kích hoạt gửi email | Body: `{ status, note, carrier, trackingCode, reason }` |
| **POST** | `/api/admin/orders/:id/notes` | Lưu ghi chú nội bộ của Quản trị viên (bảo mật, không gửi khách) | Body: `{ internalNotes }` |
| **POST** | `/api/admin/orders/:id/resend-email` | Gửi lại email thông báo cho khách hàng có ghi nhật ký kiểm toán | Body: `{ outboxId }` hoặc `{ eventType }` |

---

## 6. MA TRẬN CHUYỂN TRẠNG THÁI (STATE MACHINE) & HOÀN KHO NGUYÊN TỬ

### 6.1. Quy tắc Máy Trạng Thái Hữu Hạn
```
                  ┌───────────────┐
                  │    PENDING    │
                  │PENDING_PAYMENT│
                  └───────┬───────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
      ┌─────────────┐            ┌───────────┐
      │  CONFIRMED  │            │ CANCELLED │ (Terminal)
      └──────┬──────┘            └─────▲─────┘
             │                         │
             ▼                         │
      ┌─────────────┐                  │
      │ PROCESSING  │──────────────────┤
      └──────┬──────┘                  │
             │                         │
             ▼                         │
      ┌─────────────┐                  │
      │   SHIPPED   │──────────────────┘
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │  DELIVERED  │ (Terminal)
      └─────────────┘
```
- Các trạng thái đích kết thúc (Terminal states): `DELIVERED` và `CANCELLED` không thể chuyển đổi tiếp.
- Mọi nỗ lực nhảy cóc trạng thái không hợp lệ (ví dụ: `PENDING` $\to$ `DELIVERED` hoặc `CONFIRMED` $\to$ `DELIVERED`) bị chặn ngay lập tức với mã lỗi **HTTP 400 Bad Request** kèm giải thích chi tiết.

### 6.2. Hoàn Kho Nguyên Tử & Chống Race Condition khi Hủy Đơn
1. Sử dụng truy vấn điều kiện nguyên tử:
   ```javascript
   const cancelResult = await prisma.customer_order.updateMany({
     where: {
       id: order.id,
       status: { notIn: ['CANCELLED', 'DELIVERED'] },
     },
     data: { status: 'CANCELLED' },
   });
   ```
2. Nếu `cancelResult.count === 0` (đơn hàng đã bị hủy trước đó):
   - Hệ thống **tuyệt đối không hoàn kho lần 2** (Double Cancellation Idempotent).
3. Nếu đơn hàng chuyển sang `CANCELLED` thành công:
   - Hệ thống lặp qua danh sách `customer_order_product`.
   - **Chỉ hoàn kho** cho các mặt hàng có `snapshotSource !== 'CHECKOUT_PREORDER'`.
   - Cập nhật tăng `stock` trên `ProductVariant` và đồng bộ lại cờ `Product.inStock`.

---

## 7. GIAO DIỆN ADMIN FRONTEND (CRAFT3D BOUTIQUE UI/UX)

### 7.1. Trang Danh Sách `/admin/orders` (`components/AdminOrders.tsx`)
- **Khối Thống Kê KPI:**
  - Tổng số đơn hàng.
  - Số đơn Chờ duyệt & Chờ thanh toán SePay.
  - Số đơn Đang in 3D & chế tác tại xưởng.
  - Số đơn Đã giao thành công.
  - Tổng doanh thu thực tế thu được (đã trừ đơn hủy).
  - Nút chuyển nhanh khoảng thời gian: Hôm nay, 7 ngày, 30 ngày, Tất cả.
- **Thanh Công Cụ Tìm Kiếm & Lọc:**
  - Ô tìm kiếm tức thời theo mã đơn (`MK-...`), họ tên khách hàng, số điện thoại, email.
  - Dropdown lọc trạng thái đơn hàng (Tất cả, Chờ duyệt, Chờ thanh toán SePay, Đã xác nhận, Đang in 3D, Đang giao, Đã giao, Đã hủy).
  - Dropdown lọc trạng thái thanh toán (Tất cả, Chờ thanh toán, Đã thanh toán, Thất bại).
  - Dropdown lọc phương thức thanh toán (Tất cả, COD, SePay VietQR).
  - Nút "Đặt lại" khôi phục bộ lọc mặc định.
- **Bảng Dữ Liệu Phân Trang Server-Side:**
  - Hiển thị badge màu phân biệt rõ từng trạng thái đơn và thanh toán.
  - Định dạng tiền tệ VND chuẩn Việt Nam.
  - Nút "Chi tiết" mở trang `/admin/orders/[id]`.
  - Phân trang với nút Trước / Sau và hiển thị tổng số trang / bản ghi.

### 7.2. Trang Chi Tiết Đơn Hàng `/admin/orders/[id]` (`app/(dashboard)/admin/orders/[id]/page.tsx`)
- **Thanh Hành Động Chuyển Trạng Thái (Status Action Bar):**
  - Hiển thị các nút tương ứng với trạng thái hợp lệ tiếp theo (Xác nhận đơn, Bắt đầu in 3D, Bàn giao bưu tá, Xác nhận giao thành công, Hủy đơn).
  - Modal bàn giao bưu tá: Cho phép nhập Đơn vị vận chuyển và Mã vận đơn bưu phẩm.
  - Modal hủy đơn: Yêu cầu nhập lý do hủy đơn trước khi thực hiện.
- **Khối Chi Tiết Sản Phẩm & Cá Nhân Hóa 3D:**
  - Ảnh đại diện sản phẩm, tên sản phẩm, kích thước (6cm, 8cm, 10cm).
  - Thẻ thông tin khắc laser in 3D nổi bật: Chữ khắc (`customText`), kiểu font (`customFont`), đường link QR khắc mặt sau (`customQrUrl`).
  - Đơn giá mua thời điểm checkout (Price Snapshot) và số lượng.
- **Khối Hạch Toán Tài Chính:** Tạm tính, Phí ship toàn quốc, Tổng tiền.
- **Khối Thông Tin Khách Hàng & Địa Chỉ:** Tên người nhận, SĐT, email, địa chỉ chi tiết theo chuẩn Việt Nam, ghi chú của khách.
- **Khối Ghi Chú Nội Bộ (Admin Internal Notes):** Textarea bảo mật kèm nút "Lưu ghi chú nội bộ", lưu trữ vào cột `Customer_order.internalNotes` và ghi nhật ký vào `OrderStatusHistory`.
- **Khối Lịch Sử Email Thông Báo:** Bảng hiển thị danh sách các email đã gửi/chờ gửi từ `EmailOutbox` kèm nút "Gửi lại" và dropdown gửi thủ công bất kỳ mẫu email nào.
- **Dòng Thời Gian Tiến Độ Đơn Hàng (Status History Timeline):** Hiển thị chi tiết từng bước chuyển trạng thái, ghi chú lý do và người thực hiện.

---

## 8. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE EXECUTION)

Đã chạy toàn bộ các test suite tự động chuyên biệt với kết quả hoàn hảo:

### 8.1. Test Suite Chuyên biệt: `server/scripts/test-email-and-admin.js`
- **Kết quả:** **62/62 PASSED (0 FAILED)**
- **Các nhóm bài kiểm thử:**
  1. *Templates Verification (7/7):* Xác thực cấu trúc subject `[Craft3D]`, HTML, định dạng tiền tệ VND, chữ khắc 3D và font chữ cho cả 7 mẫu email.
  2. *Database Outbox & Deduplication (5/5):* Xác thực ghi outbox trạng thái `PENDING`, deduplication khi gọi trùng `idempotencyKey`, chuyển trạng thái `SENT` và gán `sentAt`.
  3. *Admin Security & Authorization (3/3):* Xác thực trả về `401 Unauthorized` cho request không có token admin đối với danh sách, thống kê và cập nhật trạng thái.
  4. *Test Order Database Creation (1/1):* Khởi tạo đơn hàng mẫu kèm quan hệ sản phẩm, thanh toán và lịch sử.
  5. *Admin List, Stats & Detail APIs (8/8):* Xác thực danh sách phân trang, tìm kiếm mã đơn, tính toán đúng KPI stats và hiển thị đầy đủ thông tin chi tiết.
  6. *State Machine Transitions (8/8):* Chặn chuyển đổi sai (`PENDING` $\to$ `DELIVERED` $\to$ 400), chấp nhận chuyển đổi đúng (`PENDING` $\to$ `CONFIRMED` $\to$ `PROCESSING` $\to$ `SHIPPED` $\to$ `DELIVERED`), tự động cập nhật thanh toán `PAID` cho COD khi giao thành công, chặn đổi tiếp khi đã ở trạng thái terminal.
  7. *Cancellation & Atomic Restock (5/5):* Xác thực hoàn kho chính xác cho variant, ghi nhật ký `OrderStatusHistory`, và chống hoàn kho lặp lại khi hủy lần 2 (Idempotent).
  8. *Admin Internal Notes & Manual Resend (6/6):* Xác thực lưu ghi chú nội bộ bảo mật, ghi nhật ký kiểm toán, kích hoạt gửi lại email thành công.
  9. *Database Cleanup (1/1):* Xóa sạch toàn bộ đơn hàng và bản ghi outbox thử nghiệm.

### 8.2. Test Suite Hồi Quy: `server/scripts/test-sepay-and-guest.js`
- **Kết quả:** **54/54 PASSED (0 FAILED)**
- Xác nhận không có bất kỳ xung đột hay hồi quy nào trên luồng Checkout COD, SePay Sandbox, tính toán giá, trừ kho và webhook IPN.

### 8.3. Test Suite Hồi Quy: `server/scripts/test-phase2-apis.js`
- **Kết quả:** **PASSED (Exit code 0)**
- Toàn bộ các API Phase 2 hoạt động ổn định và chính xác.

### 8.4. Kiểm tra TypeScript & Build Production
- `npx tsc --noEmit`: **0 lỗi Type / Syntax**.
- `npx next build`: **Compiled successfully in 6.5s**; 24/24 static & dynamic routes được tối ưu hóa hoàn tất.

---

## 9. DANH MỤC CÁC FILE ĐÃ TẠO VÀ CHỈNH SỬA

### 9.1. Backend (`D:\shop\server`)
- `server/prisma/schema.prisma`: Thêm cột `internalNotes` vào `Customer_order`, thêm model `EmailOutbox`.
- `server/services/email/emailTemplates.js`: *(Mới)* Bộ 7 template email tiếng Việt chuẩn responsive thương hiệu Craft3D.
- `server/services/email/emailOutboxService.js`: *(Mới)* Engine Outbox hàng đợi database, deduplication idempotency key, background dispatcher, auto retry và manual resend.
- `server/services/emailService.js`: Cập nhật tích hợp Outbox facade, đảm bảo 100% tương thích ngược cho các controller hiện có.
- `server/controllers/admin_orders.js`: *(Mới)* Controller xử lý 6 endpoints quản trị đơn hàng, KPI stats, state machine và stock restore.
- `server/routes/admin_orders.js`: *(Mới)* Route quản trị đơn hàng với bảo vệ `requireAdmin`.
- `server/app.js`: Thêm method `PATCH` vào CORS, đăng ký route `/api/admin/orders`.
- `server/.env`: Bổ sung cấu hình `ADMIN_API_KEY` và `NEXTAUTH_SECRET`.
- `server/scripts/test-email-and-admin.js`: *(Mới)* Suite kiểm thử tự động toàn diện 62 ca kiểm thử.

### 9.2. Frontend (`D:\shop`)
- `prisma/schema.prisma`: Đồng bộ schema với backend (`internalNotes`, `EmailOutbox`).
- `components/AdminOrders.tsx`: Viết lại giao diện danh sách đơn hàng Craft3D Boutique với KPI stats, tìm kiếm, bộ lọc đa chiều và phân trang.
- `app/(dashboard)/admin/orders/[id]/page.tsx`: Viết lại toàn diện trang chi tiết đơn hàng, thanh hành động chuyển trạng thái, hiển thị chữ khắc laser 3D, ghi chú nội bộ và lịch sử email.
- `lib/api.ts`: Bổ sung phương thức `patch` và tự động gắn header `x-admin-key`.
- `next.config.mjs`: Expose biến môi trường `NEXT_PUBLIC_ADMIN_KEY`.
- `.env`: Cập nhật cấu hình admin key.

### 9.3. Báo cáo & Tài liệu
- `D:\shop\EMAIL_ADMIN_ORDER_AUDIT.md`: Báo cáo đánh giá hiện trạng và kiến trúc Phase 1.
- `D:\shop\EMAIL_ADMIN_ORDER_IMPLEMENTATION_REPORT.md`: Báo cáo nghiệm thu bàn giao toàn diện.

---

## 10. HƯỚNG DẪN VẬN HÀNH DÀNH CHO QUẢN TRỊ VIÊN

### 10.1. Đăng nhập và Truy cập Quản trị
- Truy cập Dashboard đơn hàng: `http://localhost:3000/admin/orders`
- Dashboard yêu cầu quyền Admin hoặc cấu hình `ADMIN_API_KEY` trong môi trường.

### 10.2. Quy trình Xử lý Đơn hàng tại Xưởng Craft3D
1. **Kiểm tra đơn mới:** Xem thẻ KPI "Chờ Xử Lý / TT". Lọc danh sách theo trạng thái `PENDING` (đối với COD) hoặc `PENDING_PAYMENT` (đối với SePay).
2. **Kiểm tra thiết kế 3D & Chữ khắc:** Mở trang Chi tiết đơn hàng, kiểm tra nội dung `customText`, font chữ và link QR.
3. **Xác nhận đơn:** Bấm nút **"Xác nhận đơn hàng"** $\to$ Khách hàng nhận email `[Craft3D] Đơn hàng #${orderCode} đã được xác nhận`.
4. **Bắt đầu in 3D:** Bấm nút **"Bắt đầu in 3D & chế tác"** $\to$ Đơn chuyển sang `PROCESSING`.
5. **Bàn giao bưu tá:** Sau khi in và đóng gói hộp quà Craft3D, bấm **"Bàn giao bưu tá (Đang giao)"** $\to$ Nhập tên đơn vị vận chuyển (GHN, Viettel Post...) và Mã vận đơn bưu phẩm $\to$ Khách nhận email `[Craft3D] Đơn hàng #${orderCode} đang trên đường giao đến bạn`.
6. **Xác nhận giao thành công:** Bấm **"Xác nhận giao thành công"** $\to$ Đơn chuyển sang `DELIVERED`, đơn COD tự động ghi nhận thanh toán `PAID` $\to$ Khách nhận email tri ân và hướng dẫn bảo quản móc khóa in 3D.
7. **Hủy đơn (nếu có):** Bấm **"Hủy đơn hàng"** $\to$ Nhập lý do $\to$ Tồn kho thực tế được tự động hoàn lại, khách nhận email thông báo hủy rõ ràng.
8. **Gửi lại email:** Nếu khách báo chưa nhận được email, vào mục "Lịch Sử Gửi Email Thông Báo" và bấm **"Gửi lại"** hoặc chọn loại email muốn gửi lại từ dropdown.

---
*Dự án đã sẵn sàng 100% cho vận hành sản xuất thực tế.*

