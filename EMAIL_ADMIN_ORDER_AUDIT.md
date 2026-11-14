# BÁO CÁO AUDIT HỆ THỐNG EMAIL NOTIFICATIONS & ADMIN ORDER MANAGEMENT
**Dự án:** Craft3D – Boutique Brand Store (Móc khóa & Phụ kiện in 3D cá nhân hóa)  
**Địa điểm:** `D:\shop` (Frontend Next.js 15) và `D:\shop\server` (Backend Node.js/Express + Prisma ORM + MySQL)  
**Thời gian thực hiện:** 14/11/2026  
**Trạng thái:** Hoàn thành Audit Phase 1

---

## 1. HIỆN TRẠNG HỆ THỐNG (CURRENT STATE ASSESSMENT)

### 1.1. Hiện trạng Email Notification (`server/services/emailService.js`)
* **Thành phần hiện có:**
  - Class `EmailService` sử dụng thư viện `nodemailer`.
  - Hỗ trợ Gmail SMTP (`process.env.MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`) và fallback ghi log khi chưa có thông tin SMTP hoặc khi gửi thất bại (`logEmailFallback`).
  - Đã có giao diện email HTML mang thương hiệu Craft3D (`wrapLayout`) với bảng màu ấm (#E06D53, #1E2229, #FAF9F6).
  - Có 4 phương thức gửi email cơ bản:
    1. `sendOrderConfirmation(order)`: Gửi khi đơn được tạo (đã phân biệt COD và SePay).
    2. `sendPaymentInstructions(order, checkoutUrl)`: Gửi cho đơn SePay chờ thanh toán.
    3. `sendPaymentSuccess(order, paymentInfo)`: Gửi khi nhận IPN SePay thành công.
    4. `sendOrderStatusUpdate(order, newStatus, note)`: Gửi khi đơn chuyển trạng thái.
* **Những thiếu sót & rủi ro lớn (Gaps):**
  1. **Thiếu Outbox Pattern & Hàng đợi bền bỉ (Database-backed Outbox):** Hiện tại email được kích hoạt đồng bộ (fire-and-forget qua `.catch()`) ngay trong controller `createCustomerOrder` và `handleSepayIpn`. Nếu process bị restart, mạng chập chờn hoặc Gmail rate-limit, email sẽ bị mất mà không thể retry tự động.
  2. **Chưa có Idempotency cho Email:** Webhook SePay IPN có thể gửi lại nhiều lần (replay). Nếu không có bảng Outbox với khoá `idempotencyKey` duy nhất, khách hàng có nguy cơ nhận nhiều email thanh toán trùng lặp.
  3. **Thiếu các mẫu email chuyên biệt:** Mới chỉ có 4 hàm dùng chung; thiếu mẫu chi tiết cho từng giai đoạn quan trọng theo yêu cầu nghiệp vụ:
     - `Order Confirmed` (Admin xác nhận đơn hàng)
     - `Order Shipped` (Admin chuyển sang giao hàng kèm thông tin vận chuyển/mã bưu tá)
     - `Order Delivered` (Giao hàng thành công)
     - `Order Cancelled` (Hủy đơn hàng kèm lý do, cảnh báo minh bạch chính sách hoàn tiền/hủy sản phẩm in 3D tùy biến)
  4. **Không có tính năng Gửi lại Email (Manual Resend):** Admin chưa thể bấm nút "Gửi lại email" trong trang quản trị khi khách hàng báo chưa nhận được email xác nhận hay hướng dẫn thanh toán.

---

### 1.2. Hiện trạng Quản lý Đơn hàng Backend (Order APIs & Controller)
* **Thành phần hiện có (`server/controllers/customer_orders.js`):**
  - `createCustomerOrder`: Tạo đơn hàng với mã `MK-YYMMDD-XXXX`, tính toán giá từ DB SSOT, bảo lưu snapshot giá và dữ liệu khắc tên 3D (`customText`, `customFont`, `customQrUrl`).
  - `getAllOrders`: Có phân trang cơ bản (`page`, `limit`), lọc theo `status`, `paymentStatus` và tìm kiếm text `query`.
  - `getCustomerOrder`: Lấy chi tiết đơn kèm sản phẩm, biến thể, snapshot và lịch sử thanh toán/trạng thái. Đã bảo mật bằng `checkIsAdmin` hoặc so khớp `email`/`phone`.
  - `lookupCustomerOrder`: Endpoint `POST /api/orders/lookup` phục vụ khách tra cứu an toàn qua body.
  - `updateCustomerOrder`: Hỗ trợ cập nhật trạng thái với ma trận chuyển đổi hợp lệ (`VALID_STATUS_TRANSITIONS`), hoàn kho nguyên tử (`updateMany` conditional) khi hủy đơn, loại trừ đơn Preorder không trừ kho.
* **Những thiếu sót & rủi ro lớn (Gaps):**
  1. **Chưa có API Thống kê KPI Đơn hàng (`GET /api/admin/orders/stats`):** Admin Dashboard cần các số liệu tổng hợp thời gian thực (Tổng đơn, Chờ xác nhận, Chờ thanh toán SePay, Đã thanh toán, Đang in 3D, Đang giao, Đã giao, Đã hủy) theo bộ lọc thời gian (Hôm nay, 7 ngày, 30 ngày, Tất cả). Hiện tại chưa có endpoint này.
  2. **Chưa có endpoint ghi Ghi chú nội bộ (Internal Notes) cho Admin (`POST /api/admin/orders/:id/notes`):** Đơn hàng chỉ có `orderNotice` (ghi chú của khách lúc checkout). Chủ shop cần ghi chú nội bộ (ví dụ: "Đã liên hệ khách hẹn giao trước 17h", "Đã kiểm tra file 3D hợp lệ") mà không gửi cho khách hàng.
  3. **Chưa có endpoint Gửi lại Email có kiểm soát (`POST /api/admin/orders/:id/resend-email`):** Cần endpoint cho phép admin chọn loại email muốn gửi lại (Xác nhận đơn, Hướng dẫn SePay, Thông báo giao hàng...), ghi nhận lịch sử vào `OrderStatusHistory`.
  4. **Quy định bảo mật trạng thái thanh toán:** API cập nhật trạng thái đơn chung không được phép tự do chuyển `paymentStatus` thành `PAID` nếu không phải đơn COD hoàn tất giao hàng (`DELIVERED`) hoặc thông qua IPN đã xác thực của cổng thanh toán.

---

### 1.3. Hiện trạng Giao diện Admin Frontend (`app/(dashboard)/admin/orders/`)
* **Trang danh sách (`components/AdminOrders.tsx` & `app/(dashboard)/admin/orders/page.tsx`):**
  - Mới chỉ là một bảng HTML đơn giản, gọi `GET /api/orders` một lần duy nhất lúc mount.
  - Chưa có bộ lọc trạng thái (Status, Payment Status, Payment Method).
  - Chưa có ô tìm kiếm tức thời theo mã đơn, tên khách, số điện thoại.
  - Chưa có thanh phân trang (Pagination bar) phía server.
  - Chưa hiển thị các thẻ KPI thống kê trực quan phía trên bảng.
* **Trang chi tiết đơn (`app/(dashboard)/admin/orders/[id]/page.tsx`):**
  - Đang tồn tại mã nguồn cũ từ template thương mại điện tử trước đây (hiển thị form chỉnh sửa địa chỉ, họ tên và nút xóa đơn bằng `DELETE`).
  - Chưa phản ánh giao diện Craft3D Boutique:
    - Chưa có khối thông tin khách hàng và địa chỉ giao hàng chuẩn hóa Việt Nam (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã).
    - Chưa hiển thị chi tiết tùy biến in 3D (chữ khắc `customText`, font chữ `customFont`, mã QR `customQrUrl`).
    - Chưa có thanh công cụ chuyển trạng thái đơn hàng (Xác nhận, Bắt đầu in 3D, Bàn giao bưu tá, Giao thành công, Hủy đơn kèm lý do).
    - Chưa có khu vực xem lịch sử trạng thái đơn hàng (`OrderStatusHistory`) và lịch sử giao dịch cổng SePay (`Payment`).
    - Chưa có phần xem lịch sử email đã gửi và nút "Gửi lại email".
    - Chưa có hộp ghi chú nội bộ dành riêng cho Admin.

---

### 1.4. Đánh giá Cơ sở dữ liệu (Database Schema Readiness)
* **Bảng hiện có trong `server/prisma/schema.prisma`:**
  - `Customer_order`: Lưu trữ đầy đủ mã đơn, thông tin khách hàng, địa chỉ chuẩn hóa Việt Nam, tổng tiền, phương thức và trạng thái thanh toán.
  - `customer_order_product`: Lưu trữ snapshot giá, số lượng, tùy biến khắc tên (`customText`, `customFont`, `customQrUrl`), nguồn trừ kho (`snapshotSource`).
  - `OrderStatusHistory`: Lưu lịch sử thay đổi trạng thái, ghi chú và người thực hiện (`changedBy`).
  - `Payment`: Lưu chi tiết giao dịch cổng SePay/COD (`txnRef`, `amount`, `status`, `bankCode`, `rawResponse`).
* **Hạng mục cần bổ sung an toàn (Non-breaking):**
  1. Thêm trường `internalNotes String? @db.Text` vào model `Customer_order` để lưu trữ ghi chú nội bộ của quản trị viên.
  2. Bổ sung model `EmailOutbox` phục vụ lưu trữ hàng đợi email bền vững, chống trùng lặp và hỗ trợ retry tự động:
     - `id`: UUID.
     - `orderId`: ID đơn hàng liên kết.
     - `orderCode`: Mã đơn hàng.
     - `eventType`: Loại thông báo (ORDER_CONFIRMATION, PAYMENT_INSTRUCTIONS, PAYMENT_SUCCESS, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED, MANUAL_RESEND).
     - `recipient`: Email người nhận.
     - `subject`: Tiêu đề email.
     - `htmlContent`: Nội dung HTML.
     - `textContent`: Nội dung văn bản thuần.
     - `status`: PENDING, PROCESSING, SENT, FAILED.
     - `retryCount`: Số lần đã thử gửi (mặc định 0).
     - `maxRetries`: Giới hạn thử lại (mặc định 3).
     - `lastError`: Ghi nhận thông báo lỗi nếu có.
     - `sentAt`: Thời điểm gửi thành công.
     - `idempotencyKey`: Chuỗi khoá duy nhất (@unique) chống spam/trùng lặp.
     - `createdAt`, `updatedAt`.

---

## 2. KIẾN TRÚC VÀ GIẢI PHÁP TRIỂN KHAI (PLANNED ARCHITECTURE)

### 2.1. Kiến trúc Hệ thống Email Bền vững (Reliable Email Outbox)
```
[Order Creation / Payment IPN / Admin Action]
                     │
                     ▼
       ┌───────────────────────────┐
       │     queueEmailEvent()     │  --> Ghi nhận vào DB (EmailOutbox)
       │  (with unique idempotency)│      với trạng thái PENDING
       └─────────────┬─────────────┘
                     │ (Asynchronous / Non-blocking)
                     ▼
       ┌───────────────────────────┐
       │   processEmailOutbox()    │  --> Lấy các bản ghi PENDING / retry FAILED
       │   - Nodemailer / SMTP     │
       │   - Mock fallback         │
       └─────────────┬─────────────┘
                     ├─── [Thành công] ───> status = "SENT", sentAt = NOW()
                     └─── [Thất bại]  ───> retryCount++, status = (retryCount >= 3 ? "FAILED" : "PENDING")
```
* **Lợi ích cốt lõi:**
  - Hoàn toàn tách rời (decoupled): Lỗi mạng SMTP không bao giờ làm rollback giao dịch thanh toán hoặc tạo đơn hàng.
  - Tuyệt đối không gửi email trùng khi SePay IPN replay nhiều lần nhờ khoá duy nhất `idempotencyKey` trong `EmailOutbox`.
  - Hỗ trợ cron hoặc background job tự động retry.

### 2.2. Bộ 7 Mẫu Email Tiếng Việt Chuẩn Thương Hiệu Craft3D
1. **Mẫu 1: Xác nhận đơn hàng (Order Confirmation)**
   - Kích hoạt: Ngay khi khách tạo đơn thành công (cả COD và SePay).
   - Nội dung: Tóm tắt mã đơn, danh sách sản phẩm in 3D kèm chi tiết khắc tên, chi phí và thông tin nhận hàng.
2. **Mẫu 2: Hướng dẫn thanh toán SePay (Payment Instructions)**
   - Kích hoạt: Đơn hàng SePay được khởi tạo ở trạng thái `PENDING_PAYMENT`.
   - Nội dung: Số tiền chính xác, nội dung chuyển khoản là mã đơn hàng, đường dẫn mở cổng thanh toán VietQR SePay.
3. **Mẫu 3: Thanh toán thành công (Payment Success)**
   - Kích hoạt: DUY NHẤT sau khi nhận webhook IPN từ SePay đã xác thực secret key và khớp số tiền.
   - Nội dung: Xác nhận đã nhận tiền, mã giao dịch (TxnRef), thông báo xưởng bắt đầu in 3D.
4. **Mẫu 4: Đã xác nhận đơn hàng (Order Confirmed)**
   - Kích hoạt: Khi Admin phê duyệt đơn hàng thủ công trên dashboard.
   - Nội dung: Thông báo xưởng đã duyệt thiết kế và đưa vào hàng đợi máy in 3D.
5. **Mẫu 5: Đang giao hàng (Order Shipped)**
   - Kích hoạt: Khi Admin chuyển trạng thái đơn sang `SHIPPED`.
   - Nội dung: Thông báo sản phẩm đã được đóng gói và bàn giao cho bưu tá, kèm mã vận đơn / đơn vị vận chuyển (nếu có).
6. **Mẫu 6: Giao hàng thành công (Order Delivered)**
   - Kích hoạt: Khi đơn được cập nhật thành `DELIVERED`.
   - Nội dung: Cảm ơn khách hàng, hướng dẫn bảo quản móc khóa in 3D, mời đánh giá sản phẩm.
7. **Mẫu 7: Đơn hàng đã hủy (Order Cancelled)**
   - Kích hoạt: Khi Admin hoặc khách hủy đơn hàng hợp lệ.
   - Nội dung: Thông báo lý do hủy rõ ràng, xác nhận hoàn kho, chính sách xử lý thanh toán minh bạch (không tạo kỳ vọng hoàn tiền giả lập nếu chưa cấu hình gateway refund).

### 2.3. Thiết kế Admin Order APIs (`server/routes/admin_orders.js`)
* Tất cả các routes đều được bảo vệ nghiêm ngặt bằng middleware `requireAdmin`:
  - `GET /api/admin/orders`: Hỗ trợ phân trang (`page`, `limit`), tìm kiếm (`q`), lọc trạng thái (`status`, `paymentStatus`, `paymentMethod`, `dateRange`).
  - `GET /api/admin/orders/stats`: Trả về số liệu thống kê thời gian thực cho các trạng thái đơn theo khoảng thời gian (`today`, `7d`, `30d`, `all`).
  - `GET /api/admin/orders/:id`: Trả về toàn diện dữ liệu đơn hàng (thông tin khách, danh sách sản phẩm snapshot & customization 3D, thanh toán, lịch sử trạng thái, lịch sử email outbox).
  - `PATCH /api/admin/orders/:id/status`: Thực hiện chuyển đổi trạng thái nghiêm ngặt, hoàn kho nguyên tử nếu hủy đơn, kích hoạt gửi email tương ứng vào outbox. Không cho phép đổi paymentStatus thành PAID tùy tiện.
  - `POST /api/admin/orders/:id/notes`: Lưu ghi chú nội bộ chỉ quản trị viên nhìn thấy.
  - `POST /api/admin/orders/:id/resend-email`: Cho phép Admin gửi lại bất kỳ mẫu email nào cho khách, ghi nhận vào `OrderStatusHistory`.

### 2.4. Tái thiết kế Giao diện Quản trị Đơn hàng (Admin UI/UX)
* **Giao diện danh sách `/admin/orders`:**
  - 4 Thẻ KPI thống kê số liệu tổng quan với bộ lọc ngày (Hôm nay, 7 ngày, 30 ngày, Tất cả).
  - Thanh công cụ lọc đa chiều: Ô tìm kiếm (Mã đơn, Tên, Số điện thoại, Email), Dropdown trạng thái đơn hàng, Dropdown trạng thái thanh toán, Nút xóa bộ lọc.
  - Bảng dữ liệu hiện đại mang phong cách Boutique Craft3D: Hiển thị badge màu sắc rõ ràng cho từng trạng thái, định dạng tiền tệ VND chuẩn xác, thời gian định dạng tiếng Việt.
  - Phân trang server-side linh hoạt.
* **Giao diện chi tiết `/admin/orders/[id]`:**
  - Khối tóm tắt trạng thái và thanh hành động (Status Action Bar): Xác nhận đơn, Bắt đầu in 3D, Bàn giao bưu tá, Giao thành công, Hủy đơn (kèm modal nhập lý do).
  - Khối chi tiết sản phẩm in 3D: Xem ảnh thu nhỏ, tên sản phẩm, kích thước (6cm, 8cm, 10cm), chữ khắc laser (`customText`), font chữ (`customFont`), nội dung QR (`customQrUrl`), số lượng và giá snapshot.
  - Khối thông tin khách hàng & địa chỉ nhận hàng đầy đủ.
  - Khối hạch toán tài chính (Tạm tính, Phí ship, Tổng thanh toán, Phương thức COD/SePay, Trạng thái thanh toán).
  - Khối Ghi chú nội bộ (Admin Internal Notes) với form lưu tức thời.
  - Khối Lịch sử Email (Email History Log) hiển thị danh sách các email đã gửi/chờ gửi kèm nút "Gửi lại email" an toàn.
  - Khối Dòng thời gian tiến độ đơn hàng (`OrderStatusHistory Timeline`).

---

## 3. KẾ HOẠCH TRIỂN KHAI TUẦN TỰ (IMPLEMENTATION MILESTONES)

1. **Bước 1: Nâng cấp Cơ sở dữ liệu (Prisma Schema & Safe Push)**
   - Cập nhật `Customer_order` (thêm trường `internalNotes`).
   - Cập nhật model `EmailOutbox`.
   - Thực thi safe push đồng bộ cho backend và frontend, bảo tồn 100% dữ liệu hiện hữu.
2. **Bước 2: Triển khai Module Email & Hàng đợi Outbox (`server/services/email/`)**
   - Viết module tạo 7 mẫu email tiếng Việt chuẩn responsive.
   - Viết service `emailOutboxService.js` xử lý queue, process, retry, manual resend.
   - Tích hợp outbox vào `createCustomerOrder` và `handleSepayIpn`.
3. **Bước 3: Triển khai Admin Order APIs (`server/controllers/admin_orders.js`)**
   - Xây dựng 6 endpoints quản trị đơn hàng với bảo mật `requireAdmin`.
   - Mount routes vào `server/app.js` và cập nhật CORS methods (thêm `PATCH`).
4. **Bước 4: Nâng cấp Giao diện Frontend Admin Orders**
   - Viết lại `components/AdminOrders.tsx` với KPI, search, filters, pagination.
   - Viết lại `app/(dashboard)/admin/orders/[id]/page.tsx` thành trang chi tiết đơn hàng cao cấp chuẩn Craft3D Boutique.
   - Thêm phương thức `patch` và hỗ trợ token admin trong `lib/api.ts`.
5. **Bước 5: Kiểm thử Tự động Toàn diện (Automated Testing)**
   - Xây dựng script kiểm thử chuyên biệt `server/scripts/test-email-and-admin.js`.
   - Kiểm tra 7 triggers email, outbox idempotency, admin authorization, status transitions, stock restoration.
   - Chạy hồi quy các test suite trước đó (`test-sepay-and-guest.js`, `test-phase2-apis.js`).
   - Kiểm tra kiểu dữ liệu TypeScript (`npx tsc --noEmit`) và build Next.js (`npx next build`).
6. **Bước 6: Lập Báo cáo Bàn giao Hoàn tất (`EMAIL_ADMIN_ORDER_IMPLEMENTATION_REPORT.md`)**
   - Tổng kết toàn bộ kết quả triển khai, bằng chứng kiểm thử, cấu hình và hướng dẫn vận hành.

---
*Báo cáo Audit Phase 1 đã hoàn thành và sẵn sàng cho việc triển khai code.*

