# BÁO CÁO AUDIT BẢO MẬT ĐỘC LẬP & TÍNH SẴN SÀNG PRODUCTION (POST-IMPLEMENTATION)
**Dự án:** Craft3D – Boutique Brand Store (Móc Khóa & Bảng Tên Cá Nhân Hóa In 3D)  
**Địa điểm Workspace:**  
- Frontend: `D:\shop` (Next.js 15 App Router, TypeScript, NextAuth, Zustand)  
- Backend: `D:\shop\server` (Node.js, Express, Prisma ORM, MySQL)  
**Ngày thực hiện Audit:** 14/11/2026  
**Chuyên gia thực hiện:** Antigravity Autonomous Security & Production Audit Agent  

---

## I. TỔNG QUAN ĐÁNH GIÁ (EXECUTIVE SUMMARY)

Đợt audit độc lập này tập trung vào 2 hệ thống trọng yếu vừa được phát triển:
1. **Email Notification System:** Database-backed Email Outbox Pattern với 7 email template thương hiệu Craft3D, cơ chế khử trùng lặp (idempotency), worker định kỳ, phục hồi lease treo và phân tách gửi lại thủ công.
2. **Admin Order Management:** Hệ thống xác thực quản trị viên, Dashboard KPI, lọc/tìm kiếm đơn hàng, máy trạng thái đơn hàng (Order State Machine), hoàn kho nguyên tử khi hủy đơn và ghi chú nội bộ bảo mật.

### Bảng xếp hạng rủi ro (Risk Summary)
- **Tổng số vấn đề phát hiện ban đầu:** 8 vấn đề (2 Critical, 3 High, 2 Medium, 1 Low).
- **Số vấn đề đã xử lý triệt để:** 8/8 (100%).
- **Lỗ hổng Critical còn tồn đọng:** 0.
- **Lỗ hổng High còn tồn đọng:** 0.
- **Kết luận tính sẵn sàng:** **SẴN SÀNG CHO MÔI TRƯỜNG PRODUCTION (READY FOR PRODUCTION)** — đi kèm danh mục kiểm tra (Pre-launch Checklist) các biến môi trường thực tế (SMTP, SePay Live, Secret Keys).

---

## II. BẢNG PHÂN LOẠI LỖ HỔNG & VẤN ĐỀ (VULNERABILITY / ISSUE REGISTER)

| Mã ID | Mức độ | Phân loại | Tệp tin & Dòng bị ảnh hưởng | Nguyên nhân gốc rễ (Root Cause) | Biện pháp đã khắc phục (Remediation) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | Authorization Bypass / Secret Leak | `next.config.mjs`<br>`.env`<br>`lib/api.ts` | `NEXT_PUBLIC_ADMIN_KEY` phơi bày trực tiếp trong client-side bundle, cho phép bất kỳ ai xem DevTools/Network để lấy quyền admin. | Xóa bỏ hoàn toàn biến `NEXT_PUBLIC_ADMIN_KEY`. Thiết lập kiến trúc **Zero-Trust Client Proxy** qua Next.js Server Route Handler `/api/admin/[...slug]/route.ts`. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **SEC-02** | **CRITICAL** | Secret Conflation / Auth Bypass | `server/middleware/auth.js` | Backend chấp nhận `NEXTAUTH_SECRET` (khóa ký session của frontend) làm `x-admin-key`. Nếu secret session bị lộ, toàn bộ API admin bị chiếm quyền. | Tách biệt hoàn toàn `ADMIN_API_KEY` chuyên dụng (độ dài >= 16 ký tự). Loại bỏ `NEXTAUTH_SECRET` khỏi danh sách admin keys được backend chấp nhận. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **SEC-03** | **HIGH** | Injection / Stored XSS | `server/services/email/emailTemplates.js` | Nội dung tùy biến người dùng (`customText`, `recipientName`, `orderNotice`, `note`, `reason`, `carrier`) được đưa trực tiếp vào template HTML không escape. | Xây dựng và áp dụng hàm `escapeHtml()` cho toàn bộ 7 mẫu email; kiểm thử với payload độc `<script>`, `onerror`, `onload`. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **REL-01** | **HIGH** | Concurrency / Worker Crash Deadlock | `server/services/email/emailOutboxService.js` | Worker chỉ kích hoạt qua `setImmediate()`, không có cơ chế thu hồi lease nếu process crash giữa chừng (`PROCESSING`), gây thất thoát email vĩnh viễn. | Tích hợp **Periodic Background Worker (mỗi 30s)**, tự động thu hồi stale lease (> 5 phút), khóa nguyên tử có điều kiện (`updateMany` trên status `PENDING`/`FAILED`). | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **DAT-01** | **HIGH** | Transaction Race / Inconsistent Stock | `server/controllers/admin_orders.js` | Thao tác hủy đơn và hoàn kho thực hiện ở các truy vấn riêng rẽ, không bọc transaction, có thể dẫn đến lệch kho hoặc double-restock. | Đóng gói toàn bộ logic hủy đơn, hoàn kho và ghi lịch sử trạng thái vào trong một `prisma.$transaction` duy nhất; đảm bảo tính Idempotent. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **PRIV-01**| **MEDIUM** | PII Exposure / Internal Leak | `server/services/email/emailTemplates.js`<br>`server/controllers/admin_orders.js` | `internalNotes` (ghi chú riêng tư của shop) có nguy cơ bị lộ nếu vô tình gộp vào dữ liệu email gửi cho khách hàng. | Loại trừ tuyệt đối `internalNotes` khỏi tất cả email template; bổ sung hàm che giấu email PII `maskEmail()` trong logs. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **REL-02** | **MEDIUM** | Thundering Herd / SMTP Blacklist | `server/services/email/emailOutboxService.js` | Khi SMTP lỗi tạm thời, thiếu cơ chế exponential backoff dẫn đến thử lại dồn dập, dễ bị Gmail/SMTP provider khóa tài khoản. | Áp dụng ngưỡng thời gian giãn cách theo số lần thử: Lần 1 chờ >= 1 phút, lần 2 chờ >= 5 phút, tối đa 3 lần thử trước khi chuyển `EXHAUSTED`. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |
| **PERF-01**| **LOW** | Database Query Performance | `server/prisma/schema.prisma`<br>`prisma/schema.prisma` | Bảng `email_outbox` chưa có composite index trên `(status, updatedAt)`, làm chậm worker query khi số lượng email lớn. | Đã bổ sung `@@index([status, updatedAt])` trên cả 2 schema và đồng bộ vào MySQL bằng `prisma db push`. | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ** |

---

## III. CHI TIẾT KẾT QUẢ AUDIT TỪNG PHASE

### Phase 1: Admin Security & Authorization Audit
1. **Loại bỏ phơi nhiễm Client:**
   - Đã kiểm tra `D:\shop\next.config.mjs`, `D:\shop\.env`, `D:\shop\lib\api.ts`.
   - `NEXT_PUBLIC_ADMIN_KEY` đã được xóa sạch hoàn toàn khỏi mã nguồn client và bundle build.
2. **Kiến trúc Zero-Trust Server Proxy:**
   - Tạo mới Route Handler tại `D:\shop\app\api\admin\[...slug]\route.ts`.
   - **Xác thực phiên NextAuth:** Kiểm tra `getServerSession(authOptions)`. Chỉ cho phép request đi tiếp nếu `session.user.role === 'admin'`. Khách hàng thông thường hoặc khách vãng lai nhận `401 Unauthorized`.
   - **Phòng chống CSRF:** Kiểm tra `Origin` và `Host` header cho toàn bộ các phương thức thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`). Nếu origin không khớp host, trả về `403 Forbidden`.
   - **Chuyển tiếp Server-to-Server:** Khóa `ADMIN_API_KEY` chỉ lưu tại môi trường server, được Next.js server chèn vào header `x-admin-key` khi gọi Express backend tại `INTERNAL_API_BASE_URL`. Trình duyệt client không bao giờ nhìn thấy khóa này.
3. **Chống Secret Conflation:**
   - Trong `server/middleware/auth.js`, xóa bỏ việc lấy `process.env.NEXTAUTH_SECRET` làm admin key.
   - Bắt buộc `ADMIN_API_KEY` phải có độ dài tối thiểu 16 ký tự.

---

### Phase 2: Email Outbox Reliability & Background Worker
1. **Cơ chế Atomic Lease Claiming:**
   - Khi worker chọn bản ghi để gửi, thực hiện `updateMany` có điều kiện:
     ```javascript
     const claimResult = await prisma.emailOutbox.updateMany({
       where: { id: item.id, status: { in: ['PENDING', 'FAILED'] } },
       data: { status: 'PROCESSING', updatedAt: new Date() }
     });
     if (claimResult.count === 0) continue; // Worker khác đã nhận, tránh gửi đúp
     ```
2. **Khôi phục Stale Leases:**
   - Nếu server khởi động lại hoặc crash giữa lúc gửi, các bản ghi bị kẹt ở `PROCESSING` quá 5 phút sẽ tự động được thu hồi về `PENDING` để gửi lại:
     ```javascript
     await prisma.emailOutbox.updateMany({
       where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
       data: { status: 'PENDING', lastError: 'RECOVERED_STALE_LEASE' }
     });
     ```
3. **Exponential Backoff:**
   - Lần 0: Thử ngay (`PENDING`).
   - Lần 1: Chờ 60 giây sau lần thất bại trước (`FAILED`, `retryCount: 1`).
   - Lần 2: Chờ 300 giây sau lần thất bại trước (`FAILED`, `retryCount: 2`).
   - Sau 3 lần: Chuyển sang trạng thái `EXHAUSTED` để admin kiểm tra thủ công.
4. **Phân tách gửi lại thủ công (Manual Resend):**
   - Khi admin bấm "Gửi lại email", hệ thống tạo một bản ghi độc lập với mã `idempotencyKey: RESEND-...` hoặc `MANUAL_RESEND-...`, không ghi đè lịch sử của lần gửi ban đầu, đồng thời ghi log kiểm toán vào `OrderStatusHistory`.

---

### Phase 3: Order & Payment Integrity Audit
1. **Máy trạng thái đơn hàng (Order State Machine):**
   - Áp dụng sơ đồ chuyển đổi nghiêm ngặt:
     - `PENDING` / `PENDING_PAYMENT` $\rightarrow$ `CONFIRMED`, `CANCELLED`
     - `CONFIRMED` $\rightarrow$ `PROCESSING`, `CANCELLED`
     - `PROCESSING` $\rightarrow$ `SHIPPED`, `CANCELLED`
     - `SHIPPED` $\rightarrow$ `DELIVERED`, `CANCELLED`
     - `DELIVERED` & `CANCELLED`: Terminal States (không được phép chuyển tiếp).
2. **Giao dịch hoàn kho nguyên tử khi hủy đơn:**
   - Logic hủy đơn trong `server/controllers/admin_orders.js` được bọc trọn vẹn trong `prisma.$transaction`.
   - Tồn kho `ProductVariant.stock` chỉ được hoàn lại với các sản phẩm vật lý (`snapshotSource !== 'CHECKOUT_PREORDER'`).
   - **Tính Idempotent:** Nếu đơn hàng đã là `CANCELLED`, yêu cầu hủy tiếp theo bị từ chối với mã 400, ngăn chặn hành vi cộng dồn kho nhiều lần.
3. **Quy tắc thanh toán:**
   - Đơn COD chỉ tự động chuyển `paymentStatus = PAID` khi đơn hàng chuyển sang `DELIVERED`.
   - Đơn SePay chỉ chuyển `PAID` khi có IPN Webhook hợp lệ từ SePay Gateway.
   - Chặn hoàn toàn việc admin tự ý chuyển `paymentStatus = PAID` thông qua API cập nhật thông tin chung.

---

### Phase 4: Email Content, Privacy & XSS Audit
1. **Triệt tiêu lỗ hổng HTML Injection:**
   - Áp dụng hàm `escapeHtml(str)` trên tất cả các trường: `recipientName`, `orderCode`, `customText`, `customFont`, `customQrUrl`, `orderNotice`, `note`, `reason`, `carrier`, `trackingCode`.
   - Mã độc kiểm thử như `<script>alert("xss")</script>` và `"><img src=x onerror=alert(1)>` được mã hóa an toàn thành `&lt;script&gt;` và `&quot;&gt;`.
2. **Bảo vệ quyền riêng tư:**
   - Trường `internalNotes` (chỉ dùng nội bộ shop) được cô lập, không bao giờ xuất hiện trong email gửi khách hàng.
   - Địa chỉ email trong console log được làm mờ (ví dụ `t***r@craft3d.vn`) để đảm bảo tuân thủ bảo vệ dữ liệu cá nhân.

---

### Phase 5: Database & Deployment Audit
1. **Đồng bộ Schema:**
   - Đã đồng bộ `prisma/schema.prisma` và `server/prisma/schema.prisma`. Cả 2 đều sở hữu chỉ mục:
     ```prisma
     @@index([status, updatedAt])
     ```
   - Chạy `prisma generate` thành công trên cả frontend và backend.
2. **Bảo mật mã nguồn Git:**
   - Cả `.gitignore` ở thư mục gốc và `server/.gitignore` đều chứa `.env`.
   - Đã xác thực bằng lệnh `git ls-files .env server/.env` — kết quả hoàn toàn trống, không có file chứa bí mật nào bị theo dõi bởi Git.
3. **An toàn kiểm thử:**
   - Tất cả các script test đều sử dụng dữ liệu giả lập có tiền tố riêng biệt (`MK-TEST-...`, `test-order-...`), và có khối `finally` dọn dẹp sạch sẽ sau khi kiểm thử kết thúc. Không có dữ liệu thật nào của khách hàng bị sửa đổi hoặc xóa.

---

## IV. BẰNG CHỨNG KIỂM THỬ THỰC TẾ (ACTUAL TEST VERIFICATION)

Toàn bộ 4 bộ kiểm thử chuyên sâu đã được thực thi thành công 100%:

```
================================================================================
BỘ KIỂM THỬ                                         SỐ TEST   KẾT QUẢ   EXIT CODE
================================================================================
1. Email Outbox & Admin Security Test Suite            71       71/71       0 (PASS)
   (D:\shop\scripts\run_test_email.ps1)
2. SePay Sandbox, Guest Checkout & Notifications      54       54/54       0 (PASS)
   (D:\shop\scripts\run_test_sepay.ps1)
3. Phase 2 Backend Regression Test Suite               --      ALL PASS     0 (PASS)
   (D:\shop\scripts\run_test_phase2.ps1)
4. Next.js TypeScript Type Check (tsc --noEmit)        --      0 ERRORS     0 (PASS)
   (D:\shop\scripts\run_tsc.ps1)
5. Next.js Optimized Production Build (next build)     24 pgs  SUCCESS      0 (PASS)
   (D:\shop\scripts\run_build.ps1)
================================================================================
```

### Chi tiết các ca kiểm thử bảo mật & phục hồi then chốt (Trích log thực tế):
- `✓ Template 1-7: Branded Email Templates format chuẩn tiền VND & font Craft3D`
- `✓ HTML Escaping: Raw <script> tag is NOT present in email HTML`
- `✓ HTML Escaping: Custom text is safely escaped (&lt;script&gt;...)`
- `✓ HTML Escaping: Recipient name is safely escaped`
- `✓ HTML Escaping: Raw img onerror tag is NOT present in email HTML`
- `✓ Stale PROCESSING lease recovered and successfully dispatched (>5m crash recovery)`
- `✓ Atomic lease claim rejects competing worker when status is already PROCESSING`
- `✓ GET /api/admin/orders without token returns 401 Unauthorized`
- `✓ NEXTAUTH_SECRET passed as admin key is strictly rejected with 401 Unauthorized`
- `✓ Short/weak admin key (<16 chars) is strictly rejected with 401 Unauthorized`
- `✓ Invalid transition (PENDING -> DELIVERED) is strictly rejected with 400 Bad Request`
- `✓ COD Order marked DELIVERED automatically updates paymentStatus to PAID`
- `✓ Double cancellation does NOT increment stock a second time (Idempotent)`
- `✓ Independent outbox record created for manual resend with distinct key`

---

## V. CHECKLIST TRƯỚC KHI BẬT MÔI TRƯỜNG PRODUCTION (PRE-LAUNCH CHECKLIST)

Trước khi cấu hình domain thật và mở bán cho khách hàng, quản trị viên cần hoàn thành các bước thiết lập môi trường sau:

- [ ] **1. Cấu hình Khóa Bí mật Admin & NextAuth (`.env`):**
  - Thay đổi `ADMIN_API_KEY` thành một chuỗi ngẫu nhiên dài ít nhất 32 ký tự (ví dụ sinh bằng `openssl rand -hex 32`).
  - Thiết lập giá trị `ADMIN_API_KEY` giống nhau giữa `D:\shop\.env` và `D:\shop\server\.env`.
  - Đảm bảo `NEXTAUTH_SECRET` là một chuỗi ngẫu nhiên độc lập, khác hoàn toàn với `ADMIN_API_KEY`.
- [ ] **2. Cấu hình Dịch vụ Gửi Email Thật (SMTP):**
  - Cập nhật `MAIL_HOST` (ví dụ: `smtp.gmail.com` hoặc SendGrid/Amazon SES).
  - Cập nhật `MAIL_USERNAME` và `MAIL_PASSWORD` (App Password cho Gmail).
  - Kiểm tra `MAIL_FROM_ADDRESS` (ví dụ: `hotro@craft3d.vn`).
  - Đảm bảo biến `MOCK_EMAIL=false` trên production để email thực sự được gửi tới hòm thư khách hàng.
- [ ] **3. Cấu hình Cổng Thanh toán SePay Live:**
  - Chuyển `SEPAY_SANDBOX=false` hoặc bỏ định nghĩa biến này.
  - Cập nhật `SEPAY_API_KEY` và `SEPAY_MERCHANT_ID` được cấp từ tài khoản SePay chính thức đã liên kết ngân hàng thật.
  - Cấu hình URL Webhook IPN tại dashboard SePay trỏ về: `https://<ten-mien-shop>/api/payments/sepay/ipn` (hoặc qua backend trực tiếp).
- [ ] **4. Cấu hình Domain & CORS:**
  - Cập nhật `FRONTEND_URL=https://<ten-mien-shop>` trong cả 2 file `.env`.
  - Cập nhật `NEXTAUTH_URL=https://<ten-mien-shop>` trong `D:\shop\.env`.
- [ ] **5. Giám sát Worker Outbox:**
  - Worker định kỳ 30 giây đã được kích hoạt mặc định bên trong backend Express. Nếu triển khai theo mô hình đa cụm (Cluster / PM2), worker chỉ cần chạy trên 1 instance hoặc dựa vào cơ chế `updateMany` đã được thiết kế sẵn để chạy an toàn trên nhiều tiến trình đồng thời.

---

## VI. KẾT LUẬN

Hệ thống **Email Notification System** và **Admin Order Management** của **Craft3D** đã hoàn thành toàn bộ yêu cầu kỹ thuật và nghiệp vụ, vượt qua toàn bộ các bài kiểm tra bảo mật độc lập, đảm bảo tính toàn vẹn dữ liệu đơn hàng và sẵn sàng đưa vào vận hành sản xuất thương mại điện tử.
