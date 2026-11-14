# 🛒 Craft3D — Boutique E-Commerce Store for 3D-Printed & Personalized Accessories

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?style=flat&logo=mysql)](https://www.mysql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16-darkblue?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Craft3D** là nền tảng thương mại điện tử trực tuyến định hướng **Boutique Brand Store**, chuyên sản xuất và kinh doanh các sản phẩm móc khóa, bảng tên và phụ kiện trang trí được chế tác bằng công nghệ in 3D cá nhân hóa cao cấp.

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. Trải Nghiệm Mua Sắm Cá Nhân Hóa (Boutique Storefront)
* **Boutique Brand Showcase:** Trang chủ tập trung vào câu chuyện thương hiệu, quy trình chế tác in 3D tinh xảo và sản phẩm thực tế ("Móc khóa 3D thẻ bài").
* **Tùy biến trực quan (Real-time Customization):** Khách hàng có thể chọn kích thước, font chữ, nội dung khắc tên và xem preview tức thời trước khi đặt hàng.
* **Đặt hàng linh hoạt (Guest Checkout):** Cho phép đặt hàng nhanh không bắt buộc đăng ký tài khoản; hỗ trợ cả phương thức COD và chuyển khoản ngân hàng.
* **Tra cứu & Theo dõi đơn hàng:** Trang tra cứu độc lập (`/order-lookup`) qua mã đơn (VD: `MK-261114-XXXX`) và số điện thoại, cùng trang xác nhận đơn hàng chuyên nghiệp (`/order-confirmation/[orderCode]`).

### 2. Tích Hợp Cổng Thanh Toán SePay VietQR (Tự Động 100%)
* **Tạo mã VietQR động:** Chuẩn chuyển khoản Napas247 với nội dung chuyển khoản mã hóa chính xác mã đơn hàng.
* **Xử lý IPN Webhook tức thời:** Tự động kích hoạt khi tài khoản ngân hàng nhận tiền; kiểm tra chữ ký xác thực, chuyển trạng thái đơn sang `CONFIRMED` và `paymentStatus = PAID`.
* **Cơ chế Idempotency chống trùng:** Ngăn chặn việc cổng thanh toán gửi lại webhook nhiều lần dẫn đến trùng lặp giao dịch.
* **Quy trình hoàn tiền an toàn (Manual Refund Workflow):** Nếu khách hàng chuyển khoản sau khi đơn đã bị hủy, hệ thống không tự ý phục hồi đơn mà tự động chuyển sang `paymentStatus = REFUND_PENDING` và ghi nhận lịch sử kiểm toán cho admin.

### 3. Hệ Thống Email Outbox Bất Đồng Bộ Đáng Tin Cậy (Transactional Email)
* **Database-backed Outbox Pattern:** Việc tạo đơn hàng và ghi log email diễn ra nguyên tử trong cùng một Prisma Transaction (`$transaction`). Nếu đơn hàng rollback, không có email "ma" nào được phát tán.
* **Tự động phục hồi sự cố (Crash Lease Recovery):** Tự động thu hồi và gửi lại các email bị kẹt trạng thái `PROCESSING` quá 5 phút khi máy chủ bị khởi động lại đột ngột.
* **Cơ chế Retry & Exponential Backoff:** Tối đa 3 lần thử lại với khoảng cách thời gian tăng dần trước khi chuyển sang `EXHAUSTED`.
* **7 Mẫu Email HTML Thương Hiệu:** Xác nhận đơn hàng, hướng dẫn chuyển khoản VietQR, xác nhận thanh toán thành công, cập nhật giao hàng và hủy đơn kèm lý do. Mã hóa ký tự chống tấn công XSS và ẩn thông tin PII trong log.

### 4. Quản Trị Đơn Hàng & An Ninh Bảo Mật (Admin Security & Operations)
* **Admin Security Proxy:** Bảo vệ toàn bộ endpoint quản trị qua Next.js Route Handler Proxy (`/api/admin/...`), ngăn chặn lộ lọt Secret Key ra ngoài trình duyệt.
* **Chống Timing Attack:** Sử dụng thuật toán `crypto.timingSafeEqual` để so sánh khóa quản trị ở thời gian không đổi.
* **Kiểm soát đồng thời (Concurrency Control):** Trừ kho nguyên tử có điều kiện (`where: { stock: { gte: quantity } }`) ngăn chặn triệt để tình trạng bán vượt tồn kho (Oversell) khi nhiều khách cùng mua sản phẩm cuối cùng.
* **Quản trị toàn diện:** Bảng điều khiển theo dõi KPI doanh thu, lọc trạng thái, cập nhật tiến độ sản xuất/vận chuyển, ghi chú nội bộ và gửi lại email thủ công có lưu vết kiểm toán (`OrderStatusHistory`).

### 5. Sao Lưu & Khôi Phục Dữ Liệu Tự Động (Disaster Recovery)
* **Sao lưu phi khóa bảng:** Script `backup-database.js` sử dụng `mysqldump` với cờ `--single-transaction`, `--routines`, `--triggers` và truyền mật khẩu an toàn qua file cấu hình tạm thời (không lộ qua CLI arguments).
* **Khôi phục kiểm thử độc lập:** Script `restore-database.js` tự động khôi phục bản sao lưu vào cơ sở dữ liệu cô lập `craft3d_restore_test` để đối soát 100% số lượng bảng, số lượng dòng, khóa ngoại và chỉ mục trước khi áp dụng.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Lớp (Layer) | Công nghệ / Thư viện |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, Headless UI, React Icons |
| **Backend** | Node.js, Express, Prisma ORM, Nodemailer, SePay PG Node SDK, Winston, Morgan |
| **Database** | MySQL 8.x (Hỗ trợ InnoDB, UTF-8 mb4, Foreign Keys) |
| **Bảo mật & Auth** | NextAuth.js, Timing-safe Admin Key, Rate Limiting, PII Data Masking |
| **Testing** | Custom Integration Test Suites (Concurrency, Outbox, SePay, Admin Auth) |

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```text
shop/
├── app/                              # Next.js App Router
│   ├── (dashboard)/admin/            # Admin Dashboard (Orders, Products, Categories)
│   ├── api/                          # API Route Handlers (Admin Proxy, Auth)
│   ├── cart/                         # Trang giỏ hàng
│   ├── checkout/                     # Trang thanh toán (Guest Checkout, COD, VietQR)
│   ├── order-confirmation/           # Trang xác nhận đơn hàng sau thanh toán
│   ├── order-lookup/                 # Trang tra cứu đơn hàng công khai
│   ├── product/[productSlug]/        # Trang chi tiết sản phẩm & công cụ khắc tên
│   └── shop/                         # Danh mục sản phẩm Boutique
├── components/                       # UI Components (Hero, ProductGallery, Cart, etc.)
├── prisma/                           # Root Prisma Schema
├── public/                           # Ảnh sản phẩm 3D, assets, fonts
├── server/                           # Express Backend
│   ├── controllers/                  # Customer Orders, Admin, Payments, Products
│   ├── middleware/                   # Admin Auth, Rate Limiter, Logger
│   ├── prisma/                       # Backend Prisma Schema & Migrations
│   ├── routes/                       # Express Route Handlers
│   ├── scripts/                      # Backup, Restore, Migration & Test Scripts
│   ├── services/                     # Email Outbox Service, SePay Service
│   └── utills/                       # DB Singleton, Error Handling, Validations
├── types/                            # TypeScript Type Definitions
├── .env.example                      # File cấu hình mẫu cho Frontend
└── README.md                         # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Getting Started)

### 1. Yêu cầu hệ thống
* **Node.js:** Phiên bản `>= 18.x` (Khuyến nghị Node.js 20 LTS hoặc mới hơn).
* **MySQL:** Phiên bản `>= 8.0`.

### 2. Cài đặt Dependencies

Tại thư mục gốc của dự án:
```bash
# Cài đặt frontend dependencies
npm install

# Cài đặt backend dependencies
cd server
npm install
cd ..
```

### 3. Cấu hình biến môi trường (.env)

Tạo file cấu hình từ file mẫu có sẵn:

1. **Tại thư mục gốc (`d:\shop\.env`):**
```bash
cp .env.example .env
```
Cấu hình các tham số:
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NODE_ENV="development"
DATABASE_URL="mysql://root:password@localhost:3306/singitronic_nextjs"
NEXTAUTH_SECRET="your_long_random_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_API_KEY="your_secure_admin_api_key_here"
```

2. **Tại thư mục server (`d:\shop\server\.env`):**
```bash
cp server/.env.example server/.env
```
Cấu hình các tham số:
```env
PORT=3001
NODE_ENV="development"
DATABASE_URL="mysql://root:password@localhost:3306/singitronic_nextjs"
ADMIN_API_KEY="your_secure_admin_api_key_here"
NEXTAUTH_SECRET="your_long_random_nextauth_secret_here"
FRONTEND_URL="http://localhost:3000"

# Cổng thanh toán SePay Sandbox
SEPAY_API_KEY="your_sepay_api_key"
SEPAY_MERCHANT_ID="your_merchant_id"
SEPAY_SANDBOX=true

# Cấu hình gửi mail (SMTP Gmail hoặc tương đương)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your_email@gmail.com"
MAIL_PASS="your_app_password"
MAIL_FROM_ADDRESS="your_email@gmail.com"
MAIL_FROM_NAME="Craft3D Boutique Store"
```

### 4. Đồng bộ Database Schema (Prisma)

```bash
cd server
npx prisma generate
npx prisma db push
cd ..
```

### 5. Khởi chạy ứng dụng

* **Terminal 1 — Khởi động Backend (Express API trên port 3001):**
```bash
cd server
node app.js
```

* **Terminal 2 — Khởi động Frontend (Next.js trên port 3000):**
```bash
npm run dev
```

Mở trình duyệt và truy cập:
* Website: [http://localhost:3000](http://localhost:3000)
* Tra cứu đơn: [http://localhost:3000/order-lookup](http://localhost:3000/order-lookup)
* Quản trị đơn hàng: [http://localhost:3000/admin/orders](http://localhost:3000/admin/orders)

---

## 🧪 Kiểm Thử Hệ Thống (Automated Testing & Runbook)

Dự án đi kèm các bộ kiểm thử tự động toàn diện:

| Mục tiêu kiểm thử | Lệnh thực thi | Mô tả |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | `npx tsc --noEmit` | Kiểm tra toàn bộ types trên Next.js 15 |
| **Cú pháp Backend** | `node server/scripts/verify-syntax.js` | Tải và kiểm tra cú pháp tất cả modules |
| **Bảo mật & Concurrency** | `node server/scripts/test-phase1-security-concurrency.js` | Chống bán quá tồn kho, race-condition, admin auth |
| **Email Outbox & Admin** | `node server/scripts/test-email-and-admin.js` | Kiểm tra 7 email templates, lease claiming, retry |
| **SePay & Guest Checkout** | `node server/scripts/test-sepay-and-guest.js` | Kiểm tra quy trình VietQR, IPN webhook, đối soát |
| **Sao lưu Database** | `node server/scripts/backup-database.js` | Tạo bản sao lưu MySQL nhất quán vào `/backups` |
| **Khôi phục & Đối soát** | `node server/scripts/restore-database.js` | Khôi phục và đối soát dữ liệu trên test DB |

---

## 🔒 Bản Quyền & Giấy Phép (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE). Mọi đóng góp và mã nguồn đều tuân thủ các tiêu chuẩn chất lượng và an toàn bảo mật.
