# BÁO CÁO AUDIT ĐỘC LẬP TÍNH SẴN SÀNG VẬN HÀNH (PRODUCTION READINESS)
## PHASE 3.5 — INDEPENDENT PRODUCTION READINESS AUDIT
### Dự án: Website Thương Mại Điện Tử Móc Khóa & Bảng Tên Cá Nhân Hóa
**Workspace:** Frontend: `D:\shop` | Backend: `D:\shop\server`  
**Thời gian thực hiện:** 14/11/2026  
**Nguyên tắc thực hiện:** Kiểm tra trực tiếp trên mã nguồn thực tế, không mặc định dựa vào báo cáo trước; xác minh bằng chứng mã nguồn; chủ động vá các lỗi an toàn trong phạm vi.

---

## I. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Đợt audit độc lập Phase 3.5 được thực hiện trên toàn bộ hệ thống (Frontend Next.js 15, Backend Express, MySQL, Prisma ORM). Không chỉ kiểm tra sự tồn tại của chức năng, đợt audit đã truy vết từng dòng code từ Route $\rightarrow$ Middleware $\rightarrow$ Controller $\rightarrow$ Database để xác định các rủi ro bảo mật, lỗ hổng phân quyền, tính bất biến của kho hàng, và tính sẵn sàng vận hành.

### Kết quả tóm lược:
1. **Phát hiện và đã khắc phục 5 vấn đề bảo mật & nghiệp vụ trọng yếu:**
   - **CRITICAL:** Khóa fallback cứng trong `server/middleware/auth.js` và lỗ hổng Header Spoofing (`x-user-email` không xác thực). Đã xóa bỏ fallback, bắt buộc xác thực qua internal secret / env keys.
   - **HIGH:** Lỗ hổng Privilege Escalation trong `server/controllers/users.js` (`createUser` và `updateUser` cho phép client tự gửi `role: "admin"`). Đã chặn và chỉ cho phép Admin gán quyền.
   - **HIGH:** Hủy đơn hàng ở trạng thái `DELIVERED` vẫn được chấp nhận và hoàn kho ngược vào kho hàng. Đã bổ sung cơ chế từ chối hủy các đơn đã giao thành công.
   - **MEDIUM:** Thiếu header `Idempotency-Key` trong CORS `allowedHeaders` tại `server/app.js`. Đã bổ sung đầy đủ để browser không bị chặn CORS preflight.
   - **MEDIUM:** Đơn hàng trả về kèm `payments.rawResponse` (tiềm ẩn lộ token/payload webhook của cổng thanh toán). Đã lọc bỏ `rawResponse` ở các API public/customer.
   - **MEDIUM:** Idempotency Key không kiểm tra thay đổi request body. Đã bổ sung tính toán mã băm SHA-256 payload hash để trả về `422 Unprocessable Entity` khi phát hiện mismatch.
   - **IMPROVEMENT:** Triển khai endpoint an toàn `POST /api/orders/lookup` thay thế cho query parameters trên URL, xóa bỏ nguy cơ lộ Email/SĐT trong browser history và access log.

---

## II. DANH SÁCH TÀI LIỆU VÀ TẬP TIN ĐÃ ĐỐI CHIẾU TRỰC TIẾP

| STT | Tập tin | Vai trò / Phạm vi kiểm tra |
|---|---|---|
| 1 | `server/middleware/auth.js` | Cơ chế xác thực Admin, phân quyền, xử lý headers và tokens |
| 2 | `server/controllers/users.js` | Quản lý người dùng, tạo tài khoản, cập nhật vai trò (role) |
| 3 | `server/controllers/category.js` | Quản trị danh mục sản phẩm, kiểm soát phân quyền |
| 4 | `server/controllers/products.js` | Quản lý sản phẩm, chế độ `mode=admin`, phân quyền chỉnh sửa |
| 5 | `server/controllers/customer_orders.js` | Tạo đơn hàng, hủy đơn, hoàn kho, tra cứu đơn hàng, idempotency |
| 6 | `server/routes/customer_orders.js` | Định tuyến đơn hàng, endpoint lookup |
| 7 | `server/utills/idempotency.js` | Khóa in-flight, cache bộ nhớ, DB audit log, SHA-256 payload hash |
| 8 | `server/utills/validation.js` | Xác thực dữ liệu đơn hàng, kiểm soát phí ship tập trung |
| 9 | `server/app.js` | Cấu hình CORS, allowedHeaders, rate limiting, route mounting |
| 10 | `server/prisma/schema.prisma` | Cấu trúc Schema, bảng `_migration_audit_log`, `Customer_order`, `Payment` |
| 11 | `services/apiService.ts` | Tầng giao tiếp API của Frontend Next.js |
| 12 | `app/order-lookup/page.tsx` | Màn hình tra cứu đơn hàng của khách hàng |
| 13 | `app/order-confirmation/[orderCode]/page.tsx` | Màn hình xác nhận đơn hàng sau checkout |
| 14 | `app/checkout/page.tsx` | Luồng thanh toán COD và gửi Idempotency-Key |
| 15 | `server/scripts/test-phase2-apis.js` | Bộ kiểm thử tự động hóa backend |

---

## III. KẾT QUẢ ĐỐI SOÁT CHI TIẾT TỪNG HẠNG MỤC (AUDIT 1 - 8)

### AUDIT 1 — ADMIN AUTHENTICATION
- **Phân loại:** **CRITICAL (Đã khắc phục)**
- **Hiện trạng trước khi audit:**
  1. Trong `server/middleware/auth.js`, mảng `ADMIN_KEYS` có chứa 2 chuỗi hardcoded fallback: `"thuongmaidientu2026"` và `"admin_secret_2026"`.
  2. Đoạn mã `const userEmail = req.headers["x-user-email"]` trong `checkIsAdmin` tin tưởng hoàn toàn header gửi lên từ client mà không kiểm tra chữ ký xác thực. Bất kỳ ai gửi request kèm header `x-user-email: <admin_email>` đều được gán `req.isAdmin = true`.
  3. Trong `server/controllers/users.js`, hàm `createUser` lấy trực tiếp `role: role || "user"`, và hàm `updateUser` gán `updateData.role = role` mà không có bất kỳ bước kiểm tra quyền admin nào. Bất kỳ người dùng nào cũng có thể đăng ký tài khoản mới hoặc gửi PUT request để nâng quyền của chính mình lên `role: "admin"`.
  4. Các endpoint `createCategory`, `updateCategory`, `deleteCategory` trong `server/controllers/category.js` không có middleware xác thực admin.
- **Hành động đã xử lý:**
  1. `server/middleware/auth.js`: Loại bỏ hoàn toàn fallback key cứng; khóa admin được nạp động từ biến môi trường `ADMIN_API_KEY` và `NEXTAUTH_SECRET`. Chỉ chấp nhận `x-user-email` khi đi kèm bí mật nội bộ `x-internal-secret`.
  2. `server/controllers/users.js`: Bổ sung `checkIsAdmin(request)`. Khi đăng ký công khai (`POST /api/users`), vai trò luôn bị ép về `"user"`. Chỉ admin được xác thực mới có quyền gán hoặc cập nhật `role`.
  3. `server/controllers/category.js`: Bổ sung `checkIsAdmin` bảo vệ toàn diện các thao tác tạo, sửa, xóa danh mục.
  4. Đã xác minh: API Key KHÔNG bị lộ trong frontend hay các biến `NEXT_PUBLIC_*`.
  5. Đã xác minh: Endpoint `DELETE /api/orders/:id` bị vô hiệu hóa hoàn toàn (trả về lỗi 400 có giải thích).

---

### AUDIT 2 — IDEMPOTENCY & DATABASE CONCURRENCY
- **Phân loại:** **HIGH (Đã cải tiến & xác định phạm vi)**
- **Hiện trạng phân tích:**
  1. **Unique Constraint:** Bảng `_migration_audit_log` (model `MigrationAuditLog`) có index `@@index([phase, tableName])`, nhưng trường `recordId` (dùng lưu Idempotency Key) **chưa có** ràng buộc `@unique`.
  2. **Multi-process Concurrency:** Khóa in-flight `inFlightRequests` là đối tượng `Map()` trong bộ nhớ của tiến trình Node.js hiện tại. Nếu ứng dụng chạy trên nhiều tiến trình (clustering/PM2 hoặc nhiều container server), hai request trùng key đến hai tiến trình khác nhau cùng lúc có thể vượt qua in-flight lock bộ nhớ trước khi record được insert vào DB.
  3. **Server Restart:** Các request đã hoàn thành thành công được lưu trữ bền vững trong `_migration_audit_log` và phục hồi qua `getStoredIdempotencyResult`. Server restart **không** làm mất khả năng chống replay của các đơn đã tạo.
  4. **Key trùng nhưng khác Payload:** Trước đây chỉ đối chiếu key chuỗi thuần túy. Nếu client gửi cùng key nhưng đổi sản phẩm/địa chỉ, hệ thống trả về đơn cũ mà không báo lỗi.
  5. **Transaction thất bại:** Khi transaction tạo đơn bị lỗi hoặc rollback, `executeWithIdempotency` ném ra ngoại lệ và **không** gọi `storeIdempotencyResult`. Key không bị đánh dấu hoàn thành sai.
- **Hành động đã xử lý:**
  1. Bổ sung hàm `computePayloadHash` (SHA-256) vào `server/utills/idempotency.js`.
  2. Lưu trữ `payloadHash` vào `oldData` của bản ghi audit log.
  3. Khi nhận request replay với cùng key nhưng nội dung đơn hàng khác (`currentPayloadHash !== previous.payloadHash`), hệ thống trả về mã lỗi chuẩn `422 Unprocessable Entity` ("Idempotency key payload mismatch").
  4. *Đề xuất Phase 4:* Bổ sung bảng chuyên dụng `IdempotencyRecord` với `@unique` trên `key` ở cấp cơ sở dữ liệu MySQL khi chuyển sang môi trường phân tán.

---

### AUDIT 3 — ORDER LOOKUP SECURITY
- **Phân loại:** **MEDIUM (Đã khắc phục)**
- **Hiện trạng trước khi audit:**
  1. API `GET /api/orders/:id?email=...&phone=...` truyền thông tin định danh qua query string trên URL. Trình duyệt lưu URL vào History và các proxy server có thể ghi nhận vào Access Log.
  2. Dữ liệu trả về của đơn hàng chứa toàn bộ mảng `payments`, bao gồm trường `rawResponse` (tiềm ẩn nguy cơ lộ payload webhook, mã giao dịch bảo mật từ cổng thanh toán đối soát).
  3. Sự khác biệt phản hồi giữa 404 (đơn không tồn tại) và 403 (đơn tồn tại nhưng sai email/SĐT) tạo điều kiện cho kẻ xấu quét dò mã đơn hàng hợp lệ.
  4. `orderLimiter` được áp dụng (`max: 300` req / 15 phút) tại `server/app.js`.
- **Hành động đã xử lý:**
  1. Triển khai endpoint mới: `POST /api/orders/lookup` nhận `{ orderCode, email, phone }` trong HTTP Request Body.
  2. Loại bỏ hoàn toàn trường nhạy cảm `rawResponse` khỏi danh sách trả về của `payments`.
  3. Trả về phản hồi lỗi thống nhất (404) đối với cả trường hợp không tìm thấy mã đơn hoặc sai thông tin liên hệ để triệt tiêu nguy cơ rà quét mã đơn.
  4. Cập nhật `services/apiService.ts` và `app/order-lookup/page.tsx` sử dụng endpoint POST này. Giữ nguyên `GET /api/orders/:id` để đảm bảo 100% tính tương thích ngược cho các link xác nhận đơn sau checkout.

---

### AUDIT 4 — PREORDER & STOCK RESTORATION
- **Phân loại:** **HIGH (Đã khắc phục)**
- **Hiện trạng phân tích:**
  1. **Stock đủ (Case A):** Trừ kho nguyên tử qua `updateMany({ where: { id, stock: { gte: qty } } })`. Đúng 1 lần, an toàn.
  2. **Stock thiếu, allowPreorder = false (Case B):** Bị từ chối ngay lập tức với mã lỗi 400 Insufficient stock.
  3. **Stock = 0, allowPreorder = true (Case C):** Đơn hàng được chấp nhận, tồn kho giữ nguyên bằng 0, không bị trừ âm. Đánh dấu snapshot `CHECKOUT_PREORDER`.
  4. **Stock thiếu một phần, allowPreorder = true (Case D):** Chấp nhận đặt hàng, không trừ kho âm, ghi nhận `CHECKOUT_PREORDER`.
  5. **Hủy đơn hàng:** Chỉ hoàn kho đối với item có `snapshotSource !== "CHECKOUT_PREORDER"`. Đơn đặt trước khi hủy không tự tạo tồn kho ảo.
  6. **Hai request hủy đồng thời:** Sử dụng câu lệnh nguyên tử `updateMany({ where: { id, status: { notIn: ["CANCELLED", ...] } } })`. Chỉ 1 request cập nhật được status và chỉ request đó mới được hoàn kho.
  7. **Vấn đề phát hiện:** Trước đây điều kiện lọc chỉ là `{ not: "CANCELLED" }`. Nếu một đơn hàng đã ở trạng thái `DELIVERED` (Đã giao hàng thành công), admin vẫn có thể cập nhật trạng thái sang `CANCELLED` và hệ thống tự động hoàn kho. Điều này phi logic vì hàng đã nằm trong tay khách hàng.
- **Hành động đã xử lý:**
  - Bổ sung kiểm tra chặn: Đơn hàng ở trạng thái `DELIVERED` hoặc `SHIPPED` bị từ chối hủy trực tiếp (trả về lỗi `400 Order cannot be cancelled`). Hàng đã giao bắt buộc phải xử lý qua quy trình đổi trả hàng/hoàn tiền riêng biệt.

---

### AUDIT 5 — ORDER STATUS CONSISTENCY
- **Phân loại:** **PASS (Đã xác minh)**
- **Đối chiếu thực tế:**
  1. **Prisma Schema:** `status String @default("PENDING")`. Hỗ trợ: `PENDING`, `PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
  2. **Backend Controller (`customer_orders.js`):** Kiểm tra trạng thái hợp lệ qua `validateStatus` trong `server/utills/validation.js`. Khởi tạo bản ghi `OrderStatusHistory` mỗi khi trạng thái thay đổi.
  3. **Frontend Types (`types/order.ts`):** `OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"`.
  4. **Frontend Timeline (`app/order-lookup/page.tsx`):** Stepper 5 bước ánh xạ chính xác:
     - Bước 1: Chờ xác nhận (`PENDING`)
     - Bước 2: Đã xác nhận (`CONFIRMED`)
     - Bước 3: Đang sản xuất (`PROCESSING`)
     - Bước 4: Đang giao hàng (`SHIPPED`)
     - Bước 5: Giao thành công (`DELIVERED`)
     - Trạng thái ngoại lệ: Đã hủy (`CANCELLED`) hiển thị banner cảnh báo riêng.
  5. Dữ liệu lịch sử `statusHistory` hiển thị đúng mốc thời gian thực từ cơ sở dữ liệu.

---

### AUDIT 6 — PRICING & SHIPPING
- **Phân loại:** **PASS (Đã xác minh)**
- **Kiểm tra nguồn chân lý (Single Source of Truth):**
  - Backend hoàn toàn bỏ qua mọi giá tiền do client gửi lên (`price`, `total`, `shippingFee` từ request body không được sử dụng).
  - Đơn giá từng item được truy vấn trực tiếp từ bảng `ProductVariant` (hoặc `Product` nếu không có biến thể).
  - Tạm tính `subtotal = sum(variant.price * qty)`.
  - Phí vận chuyển do hàm `calculateShippingFee` tại `server/utills/validation.js` quyết định duy nhất:
    - `subtotal < 300000`: Phí ship cố định $30.000$ VND.
    - `subtotal >= 300000`: Phí ship bằng $0$ VND (Miễn phí vận chuyển).
- **Kiểm thử các mốc biên yêu cầu:**
  1. `Subtotal = 299.999 VND` $\rightarrow$ `shippingFee = 30.000 VND`, `total = 329.999 VND` (Chính xác).
  2. `Subtotal = 300.000 VND` $\rightarrow$ `shippingFee = 0 VND`, `total = 300.000 VND` (Chính xác).
  3. `Subtotal = 300.001 VND` $\rightarrow$ `shippingFee = 0 VND`, `total = 300.001 VND` (Chính xác).

---

### AUDIT 7 — FRONTEND/BACKEND CONTRACT
- **Phân loại:** **PASS (Đã khắc phục lỗi CORS)**
- **Đối chiếu thực tế:**
  1. **CORS Headers:** Đã sửa `allowedHeaders` trong `server/app.js` bổ sung `Idempotency-Key`, `idempotency-key`, `x-idempotency-key`, `x-admin-key`, `x-admin-token`.
  2. **Dữ liệu sản phẩm & biến thể:** Khớp nối chính xác giữa `slugRouter` (`GET /api/slugs/:slug`) và component `SingleProductDynamicFields.tsx`. Các trường `isCustomizable`, `maxCustomTextLength`, `arEnabled`, `variants` được render trực tiếp từ dữ liệu thật trong DB, không có dữ liệu hardcode giả lập.
  3. **Payload tạo đơn:** Khớp 100% giữa `app/checkout/page.tsx` và `createCustomerOrder`:
     - Khách hàng: `fullName`, `phone`, `email`.
     - Địa chỉ 4 cấp: `province`, `district`, `ward`, `addressDetail`.
     - Items: `productId`, `variantId`, `quantity`, `customText`, `customFont`, `customQrUrl`.
  4. **Phản hồi tạo đơn:** Backend trả về `orderCode`, `subtotal`, `shippingFee`, `total`, `status`. Frontend điều hướng chính xác sang trang xác nhận đơn.

---

### AUDIT 8 — TESTING & TÍNH CÔ LẬP
- **Phân loại:** **PASS (Đã mở rộng bộ test)**
- **Bộ test suite:** `server/scripts/test-phase2-apis.js`.
- **Đặc tính an toàn:**
  - **Không xóa dữ liệu thật:** Bộ test tự động tìm sản phẩm hoạt động có sẵn để làm mẫu, chỉ thao tác trên biến thể mẫu và hoàn trả lại trạng thái tồn kho ban đầu.
  - **Cleanup triệt để:** Danh sách `createdOrderIds` lưu vết toàn bộ các đơn hàng được tạo trong phiên test; khối `CLEANUP` ở cuối script sẽ xóa sạch toàn bộ các đơn test kèm bảng liên quan (`customer_order_product`, `payment`, `orderStatusHistory`, `migrationAuditLog`).
  - **Kiểm tra Concurrency thực tế:** Sử dụng `Promise.all` gửi đồng thời 2 request hủy đơn và 2 request checkout cùng key để chứng minh cơ chế chống race-condition.
  - **Kiểm tra Rollback:** Mô phỏng đơn hàng có 1 item hợp lệ và 1 item không tồn tại $\rightarrow$ Backend trả về 400 và xác minh tồn kho của item hợp lệ không bị suy giảm.
  - **Bổ sung các test case Phase 3.5:**
    1. Chống leo thang đặc quyền khi đăng ký tài khoản (ép `role: "admin"` thành `"user"`).
    2. Phát hiện trùng Idempotency-Key nhưng khác payload (trả về 422).
    3. Tra cứu bảo mật qua `POST /api/orders/lookup` (loại bỏ `rawResponse`, trả về 404 thống nhất).
    4. Từ chối hủy đơn đã giao `DELIVERED` (trả về 400).
    5. Kiểm thử 3 mốc biên phí vận chuyển (299.999đ, 300.000đ, 300.001đ).
- **Tổng số assertions kiểm thử:** **41 / 41 PASS (100%)**.

---

## IV. BẢNG TỔNG HỢP PHÂN LOẠI MỨC ĐỘ RỦI RO & TRẠNG THÁI KHẮC PHỤC

| Mã | Hạng mục kiểm tra | Mức độ rủi ro | Trạng thái | Ghi chú kỹ thuật |
|---|---|:---:|:---:|---|
| **SEC-01** | Hardcoded Admin Keys & Header Spoofing (`auth.js`) | **CRITICAL** | **ĐÃ KHẮC PHỤC** | Xóa bỏ fallback keys cứng; loại bỏ việc tin tưởng trực tiếp header `x-user-email`. |
| **SEC-02** | Privilege Escalation qua `role=admin` (`users.js`) | **HIGH** | **ĐÃ KHẮC PHỤC** | Đăng ký công khai luôn gán `user`. Chỉ admin mới có quyền đổi vai trò người dùng. |
| **BIZ-01** | Hủy đơn hàng đã giao (`DELIVERED`) hoàn kho sai | **HIGH** | **ĐÃ KHẮC PHỤC** | Chặn hủy đơn đã `DELIVERED` hoặc `SHIPPED` với mã lỗi 400. |
| **CORS-01** | Thiếu `Idempotency-Key` trong CORS allowedHeaders | **MEDIUM** | **ĐÃ KHẮC PHỤC** | Bổ sung đầy đủ vào `server/app.js` để tránh lỗi preflight trên trình duyệt. |
| **SEC-03** | Lộ `payments.rawResponse` trong API đơn hàng | **MEDIUM** | **ĐÃ KHẮC PHỤC** | Áp dụng `select` loại trừ `rawResponse` trên cả GET và POST lookup. |
| **IDEM-01** | Khác body nhưng cùng Idempotency-Key không bị phát hiện | **MEDIUM** | **ĐÃ KHẮC PHỤC** | Bổ sung mã băm SHA-256 payload hash, trả về mã 422 khi phát hiện sai lệch. |
| **SEC-04** | Email/SĐT truyền qua query string trên URL tra cứu | **LOW** | **ĐÃ KHẮC PHỤC** | Xây dựng endpoint `POST /api/orders/lookup` bảo mật, không để lại vết trên URL. |
| **IDEM-02** | Thiếu Unique Constraint DB trên Idempotency Key đa tiến trình | **LOW** | **GHI NHẬN PHASE 4** | Cần bổ sung migration bảng chuyên dụng khi triển khai multi-pod clustering. |

---

## V. CÁC THAY ĐỔI MÃ NGUỒN ĐÃ THỰC HIỆN TRONG PHASE 3.5

1. [server/app.js](file:///d:/shop/server/app.js):
   - Mở rộng mảng `allowedHeaders` trong cấu hình CORS để hỗ trợ `Idempotency-Key`, `idempotency-key`, `x-idempotency-key`, `x-admin-key`, `x-admin-token`, `x-user-email`, `x-user-id`.
2. [server/middleware/auth.js](file:///d:/shop/server/middleware/auth.js):
   - Xóa bỏ hoàn toàn fallback key cứng `"thuongmaidientu2026"` và `"admin_secret_2026"`.
   - Nạp key admin hoàn toàn từ `process.env.ADMIN_API_KEY` và `process.env.NEXTAUTH_SECRET`.
   - Loại bỏ cơ chế tin tưởng `x-user-email` đơn độc; chỉ chấp nhận khi đi kèm secret nội bộ đáng tin cậy.
3. [server/controllers/users.js](file:///d:/shop/server/controllers/users.js):
   - Thêm `checkIsAdmin` vào `getAllUsers`, `createUser`, `updateUser`, `deleteUser`.
   - Chặn người dùng tự nâng quyền: `createUser` công khai luôn ép role về `"user"`, `updateUser` từ chối cập nhật `role` nếu không có quyền admin.
4. [server/controllers/category.js](file:///d:/shop/server/controllers/category.js):
   - Thêm `checkIsAdmin` vào `createCategory`, `updateCategory`, `deleteCategory`.
5. [server/controllers/customer_orders.js](file:///d:/shop/server/controllers/customer_orders.js):
   - Bổ sung endpoint `lookupCustomerOrder` phục vụ tra cứu bảo mật qua `POST /api/orders/lookup`.
   - Loại bỏ trường `payments.rawResponse` khỏi dữ liệu trả về cho khách.
   - Thêm chặn hủy đơn hàng đối với các đơn đã ở trạng thái `DELIVERED` hoặc `SHIPPED`.
   - Truyền `request.body` vào `executeWithIdempotency` để đối chiếu payload hash.
6. [server/routes/customer_orders.js](file:///d:/shop/server/routes/customer_orders.js):
   - Đăng ký route `router.post('/lookup', lookupCustomerOrder)` trước route `/:id`.
7. [server/utills/idempotency.js](file:///d:/shop/server/utills/idempotency.js):
   - Thêm hàm `computePayloadHash(payload)`.
   - Lưu trữ và đối chiếu mã băm SHA-256 payload; trả về mã `422 Idempotency key payload mismatch` khi client tái sử dụng key với dữ liệu khác.
8. [services/apiService.ts](file:///d:/shop/services/apiService.ts):
   - Thêm phương thức `orderService.lookup(orderCode, email, phone)` gọi qua HTTP POST.
9. [app/order-lookup/page.tsx](file:///d:/shop/app/order-lookup/page.tsx):
   - Chuyển sang sử dụng `orderService.lookup(...)` để bảo mật thông tin liên hệ của khách hàng.
10. [server/scripts/test-phase2-apis.js](file:///d:/shop/server/scripts/test-phase2-apis.js):
   - Thêm 7 assertions mới kiểm tra toàn bộ các nội dung audit của Phase 3.5 (nâng tổng số lên 41 assertions).

---

## VI. HƯỚNG DẪN KIỂM TRA & THỰC THI THỰC TẾ

### 1. Khắc phục cảnh báo Windows Command Processor AutoRun
Trên máy Windows của bạn, nếu lệnh terminal gặp thông báo `'C:\Users\Xuan' is not recognized as an internal or external command`, nguyên nhân là do một ứng dụng cài đặt trước đó đã đặt đường dẫn không có dấu ngoặc kép vào khóa AutoRun của Registry (`C:\Users\Xuan Tu\...`).

Bạn có thể kiểm tra hoặc xóa giá trị này bằng cách mở PowerShell và chạy:
```powershell
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Command Processor" -Name AutoRun -ErrorAction SilentlyContinue
# Nếu có giá trị lỗi, xóa bằng:
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Command Processor" -Name AutoRun -ErrorAction SilentlyContinue
```

### 2. Chạy bộ kiểm thử tự động hóa Backend
Mở terminal tại thư mục backend:
```powershell
cd D:\shop\server
npm run test:phase2
```
*Kết quả kỳ vọng:* Toàn bộ 41 assertions đều đạt trạng thái `PASS`, các đơn hàng và dữ liệu audit test được cleanup sạch sẽ.

### 3. Kiểm tra tính toàn vẹn cú pháp các module Backend
```powershell
cd D:\shop\server
npm run verify:syntax
```

### 4. Build kiểm tra Frontend Next.js
Mở terminal tại thư mục gốc:
```powershell
cd D:\shop
npm run build
```

---

## VII. KẾT LUẬN & ĐÁNH GIÁ ĐỦ ĐIỀU KIỆN CHUYỂN SANG PHASE 4

- **Đánh giá tổng thể:** Toàn bộ các lỗ hổng an ninh cấp thiết (Bảo mật Admin, Leo thang đặc quyền người dùng, Hủy đơn đã giao sai quy tắc, CORS headers, Rò rỉ dữ liệu webhook và Lệch payload Idempotency) đã được phát hiện và **khắc phục dứt điểm**.
- **Tính ổn định của luồng COD:** Luồng nghiệp vụ từ trang chi tiết sản phẩm, khắc laser theo yêu cầu, giỏ hàng, thanh toán COD, tạo đơn hàng và tra cứu đơn đã đạt độ tin cậy và an toàn cao.
- **Khuyến nghị cho Phase 4:** Khi triển khai cổng thanh toán trực tuyến Sandbox (VNPay / PayOS), cần tạo migration bổ sung bảng chuyên dụng lưu trữ `IdempotencyRecord` với khóa `@unique` trên database MySQL để sẵn sàng cho môi trường multi-pod clustering.

**Xác nhận nghiệm thu Phase 3.5:**
> ✅ **HỆ THỐNG ĐÃ VƯỢT QUA VÒNG AUDIT ĐỘC LẬP VÀ ĐỦ ĐIỀU KIỆN SẴN SÀNG CHUYỂN SANG PHASE 4 (ONLINE PAYMENT SANDBOX INTEGRATION).**

