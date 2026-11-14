# BÁO CÁO TÁI THIẾT KẾ TOÀN DIỆN UI/UX
## CỬA HÀNG THƯƠNG MẠI ĐIỆN TỬ MÓC KHÓA & PHỤ KIỆN CÁ NHÂN HÓA IN 3D (CRAFT3D)

**Dự án:** Website Thương Mại Điện Tử Móc Khóa & Bảng Tên Cá Nhân Hóa In 3D  
**Workspace:** `D:\shop` (Frontend Next.js 15) & `D:\shop\server` (Backend Node.js/Express + Prisma MySQL)  
**Ngày hoàn thành:** 14/11/2026  
**Trạng thái kiểm tra:** TypeScript passed (0 errors), Next.js Production Build passed (Code 0, 24/24 routes)

---

## 1. TỔNG QUAN GIAO DIỆN CŨ VÀ CÁC VẤN ĐỀ ĐÃ XỬ LÝ

### 1.1. Thực trạng giao diện ban đầu
- **Định vị sản phẩm không phù hợp:** Giao diện ban đầu kế thừa từ template cửa hàng đồ điện tử công nghệ cũ ("Singitronic"), bày bán điện thoại thông minh, laptop, TV, tai nghe và máy tính bảng.
- **Rào cản ngôn ngữ:** Toàn bộ nội dung giao diện sử dụng tiếng Anh (Home, Shop, Cart, Checkout, Categories, Filters, Newsletter, v.v.), không phù hợp với đối tượng khách hàng mục tiêu tại thị trường Việt Nam (học sinh, sinh viên, giới trẻ yêu thích phụ kiện độc lạ, người nuôi thú cưng, doanh nghiệp đặt quà tặng).
- **Thông tin liên hệ & thương hiệu giả định:** Số điện thoại giả định nước ngoài (`+381 61 888 888`), email giả định (`test@email.com`), địa chỉ không có thực.
- **Lỗi hiển thị giá và bộ lọc tiền tệ:**
  - Giao diện cũ hiển thị đơn vị USD (`$`).
  - Thanh trượt bộ lọc giá (Filters) có dải lọc từ `0` đến `3000` USD và component `Products.tsx` gán giá trị trần mặc định là `3000`. Khi chuyển sang tiền tệ Việt Nam Đồng (VND), các sản phẩm thực tế có giá từ 35.000 ₫ đến 180.000 ₫ sẽ bị bộ lọc `<= 3000` loại bỏ hoàn toàn, gây ra hiện tượng không hiển thị sản phẩm trên trang Cửa hàng.
- **Trải nghiệm cá nhân hóa còn sơ khai:** Khách hàng chưa thể hình dung được chữ khắc, phông chữ hoặc màu sắc sản phẩm in 3D sẽ trông như thế nào khi thành phẩm.
- **Trải nghiệm AR/VR chưa được nhấn mạnh:** Tính năng AR/VR (mô hình 3D thực tế ảo `.glb` / `.usdz`) chưa có điểm nhấn trực quan để khuyến khích người dùng ướm thử móc khóa lên balo, túi xách hay chùm chìa khóa.

### 1.2. Giải pháp chuyển đổi toàn diện
1. **Tái định vị thương hiệu thành "Craft3D":**
   - Thương hiệu đại diện cho công nghệ in 3D hiện đại kết hợp nghệ thuật thủ công tinh xảo.
   - Slogan: *"Nhỏ xinh theo cách của riêng bạn."*
2. **Bản địa hóa 100% tiếng Việt:**
   - Dịch thuật tự nhiên, tinh tế, chuẩn mực văn phong thương mại điện tử Việt Nam.
   - Xóa bỏ mọi thông tin giả mạo; thay thế bằng chính sách giao hàng toàn quốc, cam kết đổi trả 7 ngày và hotline hỗ trợ.
3. **Chuẩn hóa tiền tệ & khắc phục triệt để lỗi bộ lọc giá:**
   - Sử dụng định dạng `formatVND(price)` chuẩn Việt Nam (ví dụ: `45.000 ₫`, `120.000 ₫`).
   - Cập nhật dải trượt giá từ `30.000 ₫` đến `500.000 ₫`, nâng giá trị mặc định tối đa trong `Products.tsx` lên `1.000.000 ₫`.
4. **Bổ sung Live Customization Mockup:**
   - Người mua có thể gõ nội dung tên/số điện thoại, chọn font chữ và màu sắc để xem trước mẫu mock-up hiển thị tức thì.
5. **Nổi bật tính năng AR 3D:**
   - Gắn huy hiệu và thẻ tương tác AR thực tế ảo trên trang chủ và trang chi tiết sản phẩm.

---

## 2. DESIGN SYSTEM MỚI (CRAFT3D BRAND IDENTITY)

Hệ thống nhận diện thương hiệu mới được xây dựng theo phong cách **Modern Craftsmanship & Tech-Artisan**:

### 2.1. Bảng màu chủ đạo (Color Palette)
- **Nền chính (`brand.bg`): `#FAF9F6` (Kem ấm Off-White / Warm Sand)**
  - Mang lại cảm giác ấm áp, gần gũi, tính thủ công cao, loại bỏ sự chói gắt của màu trắng tuyết `#FFFFFF`.
- **Màu văn bản & khung chính (`brand.primary`): `#1E2229` (Than chì đậm Dark Slate / Charcoal)**
  - Đảm bảo độ tương phản cao (đạt chuẩn WCAG AAA), tạo cảm giác chắc chắn, chuyên nghiệp và sắc sảo như vật liệu in 3D.
- **Màu điểm nhấn (`brand.accent`): `#E06D53` (San hô nung Terracotta / Coral Accent)**
  - Gam màu tươi sáng, ấm áp, kích thích thị giác mua sắm và thể hiện tính sáng tạo không giới hạn, thay thế cho màu xanh dương công nghệ lỗi thời.
- **Nền thẻ phụ (`brand.subtle`): `#F5F3EF`**
  - Giúp phân tầng khối nội dung mượt mà, dễ chịu cho mắt.
- **Đường viền (`brand.border`): `#E7E5E4`**
  - Viền mảnh, hiện đại, tăng tính cấu trúc cho các thẻ sản phẩm và form nhập liệu.

### 2.2. Typography & Phân tầng thị giác
- Font chữ sans-serif hiện đại với tính năng `-webkit-font-smoothing: antialiased` trên toàn website.
- **H1 (Hero):** 36px - 48px, font-black, leading-tight, phân đoạn từ khóa màu San hô nung.
- **H2 (Section Titles):** 24px - 32px, font-bold, căn giữa hoặc căn trái với gạch chân điểm nhấn.
- **H3 (Card Titles):** 16px - 18px, font-semibold, bo viền thanh nhã.
- **Body & Meta:** 14px - 15px, text-neutral-600, khoảng cách dòng thoáng (leading-relaxed).

### 2.3. Bố cục & Spacing (Layout & Spacing)
- Thiết kế dạng lưới responsive linh hoạt (Mobile 1 cột, Tablet 2-3 cột, Desktop 4 cột).
- Thẻ sản phẩm chuẩn tỷ lệ `aspect-square`, viền bo góc nhẹ (`rounded-2xl`), hiệu ứng đổ bóng khi hover (`hover:shadow-md transition-all duration-300`).
- Sticky Header thông minh giữ thanh tìm kiếm, giỏ hàng và danh mục luôn trong tầm với của người dùng.

### 2.4. Huy hiệu & Thẻ cam kết (Badges & Trust Seals)
- Thẻ tag sản phẩm: "In 3D", "Khắc tên", "Mới", "Hot", "AR 3D", "Pre-order".
- Bộ ba cam kết chất lượng:
  1. *Freeship toàn quốc* cho mọi đơn hàng từ 300.000 ₫.
  2. *Thanh toán khi nhận hàng (COD)* - kiểm tra sản phẩm trước khi thanh toán.
  3. *Đổi mới trong 7 ngày* nếu phát hiện lỗi kỹ thuật hoặc sai sót in ấn.

---

## 3. DANH SÁCH TRANG ĐÃ REDESIGN TOÀN DIỆN

| STT | Trang | Đường dẫn file | Nội dung & Điểm đổi mới chính |
| :---: | :--- | :--- | :--- |
| 1 | **Layout gốc & Metadata** | `app/layout.tsx` | Thiết lập `<html lang="vi">`, cập nhật SEO title/description cho Craft3D, header/footer co giãn flex chuẩn. |
| 2 | **Trang chủ (Homepage)** | `app/page.tsx` | Tích hợp 7 phân khu thương mại điện tử chuyên sâu: Hero, Câu chuyện thương hiệu, Trải nghiệm cá nhân hóa, Bộ sưu tập, Sản phẩm nổi bật, Cam kết dịch vụ, Bản tin. |
| 3 | **Trang Cửa hàng (Shop)** | `app/shop/[[...slug]]/page.tsx` | Bố cục 2 cột chuyên nghiệp: Sidebar bộ lọc danh mục/giá bên trái và lưới sản phẩm kèm phân trang bên phải. |
| 4 | **Trang Tìm kiếm** | `app/search/page.tsx` | Hiển thị kết quả tìm kiếm với số lượng sản phẩm tìm thấy và trạng thái rỗng thân thiện khi không có kết quả. |
| 5 | **Chi tiết sản phẩm** | `app/product/[productSlug]/page.tsx` | Hiển thị thư viện ảnh, thông số kỹ thuật in 3D (vật liệu PLA/PETG, độ dày lớp 0.16mm), bộ chọn biến thể động, xem trước chữ khắc, huy hiệu AR/VR và bảo hành. |
| 6 | **Giỏ hàng (Cart)** | `app/cart/page.tsx` & `components/modules/cart/index.tsx` | Giao diện giỏ hàng tiếng Việt, hiển thị đầy đủ thông tin khắc tên, thanh báo tiến độ Freeship 300K, tóm tắt chi phí rõ ràng. |
| 7 | **Thanh toán COD (Checkout)** | `app/checkout/page.tsx` | Form địa chỉ nhận hàng tiếng Việt, lựa chọn phương thức COD, tự động áp dụng phí ship (0 ₫ nếu $\ge 300\text{k}$, 30.000 ₫ nếu $< 300\text{k}$), gửi kèm Idempotency-Key. |
| 8 | **Xác nhận đơn hàng** | `app/order-confirmation/[orderCode]/page.tsx` | Trình bày mã đơn hàng, trạng thái tiếp nhận, tiến độ dự kiến in và đóng gói, tổng thanh toán và hướng dẫn hỗ trợ. |
| 9 | **Tra cứu đơn hàng** | `app/order-lookup/page.tsx` | Tra cứu nhanh đơn hàng bằng mã đơn và SĐT/email, hiển thị chi tiết sản phẩm, chữ khắc tùy biến và trạng thái xử lý. |
| 10 | **Đăng nhập & Đăng ký** | `app/login/page.tsx`, `app/register/page.tsx` | Form đăng nhập/đăng ký gọn gàng, hỗ trợ tiếng Việt, thông báo lỗi rõ ràng theo tông màu thương hiệu. |
| 11 | **Trung tâm thông báo** | `app/notifications/page.tsx` | Danh sách thông báo về tiến độ đơn hàng và khuyến mãi in 3D từ Craft3D. |
| 12 | **Trang 404 (Not Found)** | `app/not-found.tsx`, `app/product/not-found.tsx` | Thông báo sản phẩm hoặc trang không tồn tại bằng tiếng Việt, kèm nút điều hướng quay lại Cửa hàng. |
| 13 | **Giao diện Admin Dashboard** | `app/(dashboard)/admin/*` | Nâng cấp thanh điều hướng (Sidebar), tiêu đề bảng điều khiển và bảng dữ liệu sản phẩm, đơn hàng sang tiếng Việt và tông màu `#1E2229`. |

---

## 4. DANH SÁCH COMPONENT ĐƯỢC TẠO MỚI VÀ CHỈNH SỬA

### 4.1. Component mới được tạo
- **`components/CustomizationHighlight.tsx`**: Phân khu 4 bước cá nhân hóa trên trang chủ, cho phép người dùng nhập trực tiếp chữ muốn khắc (ví dụ: "Minh Anh", "Bắp <3"), chọn phông chữ và xem mô phỏng tức thì trước khi quyết định mua hàng.

### 4.2. Component giao diện chung (Header, Footer, Navigation)
- **`components/Header.tsx`**: Header cố định với logo khối 3D Craft3D, menu điều hướng sản phẩm in 3D, ô tìm kiếm thông minh, icon giỏ hàng và danh sách yêu thích có badge số lượng màu san hô, menu mobile drawer mượt mà.
- **`components/HeaderTop.tsx`**: Dải thông báo ưu đãi "Miễn phí vận chuyển cho đơn hàng từ 300.000 ₫", nút tra cứu đơn hàng nhanh và liên kết tài khoản.
- **`components/Footer.tsx`**: Footer 4 cột chuyên nghiệp: Giới thiệu Craft3D, Bộ sưu tập in 3D, Chính sách khách hàng (Đổi trả 7 ngày, COD), Thông tin liên hệ xưởng in tại Hà Nội/TP.HCM.
- **`components/SearchInput.tsx`**: Ô tìm kiếm hiện đại với gợi ý placeholder tiếng Việt `"Tìm kiếm móc khóa, bảng tên in 3D..."`.
- **`components/CartElement.tsx` & `components/HeartElement.tsx`**: Thiết kế nút bấm hiện đại, viền tinh tế, số lượng hiển thị rõ ràng trên nền cam san hô.

### 4.3. Component trang chủ (Home Components)
- **`components/Hero.tsx`**: Khối tiêu đề chính với thông điệp hấp dẫn, 2 nút hành động (Xem bộ sưu tập, Tự thiết kế), đi kèm thẻ trình diễn 3D mẫu móc khóa phi hành gia.
- **`components/IntroducingSection.tsx`**: "Vì sao bạn sẽ yêu thích Craft3D?" với 4 lý do cốt lõi: In 3D sắc nét từng chi tiết, Cá nhân hóa độc bản, Vật liệu nhựa an toàn thân thiện môi trường, Món quà kỷ niệm ý nghĩa.
- **`components/CategoryMenu.tsx`**: Thẻ danh mục đại diện trực quan (Móc khóa Tên & Chữ nghệ thuật, Bảng tên Thú cưng chống lạc, Móc khóa Logo Anime & Gaming, Móc khóa Biển số xe & Quà tặng).
- **`components/ProductsSection.tsx` & `components/ProductItem.tsx`**: Hiển thị lưới sản phẩm nổi bật, hiển thị giá "Từ ... ₫", nhãn "In 3D", "Khắc tên" và nút xem chi tiết.
- **`components/Incentives.tsx`**: 4 khối cam kết về chất lượng, công nghệ AR 3D, tốc độ giao hàng và chính sách bảo hành in ấn.
- **`components/Newsletter.tsx`**: Form đăng ký nhận mã ưu đãi 10% cho đơn hàng đầu tiên.

### 4.4. Component Cửa hàng & Bộ lọc (Shop & Filter Components)
- **`components/Breadcrumb.tsx`**: Thanh điều hướng phân cấp (Trang chủ > Cửa hàng > ...).
- **`components/SortBy.tsx`**: Bộ chọn sắp xếp tiếng Việt (Mặc định, Giá thấp đến cao, Giá cao đến thấp, Tên A-Z, Tên Z-A).
- **`components/Filters.tsx`**: Bộ lọc danh mục và thanh trượt khoảng giá từ 30.000 ₫ đến 500.000 ₫.
- **`components/Products.tsx`**: Trình quản lý danh sách sản phẩm, khắc phục lỗi giá trần mặc định 3000 USD thành 1.000.000 VND.
- **`components/Pagination.tsx`**: Bộ chuyển trang thân thiện (Trang trước, Trang 1, Trang sau).
- **`components/SectionTitle.tsx` & `components/Heading.tsx`**: Khối tiêu đề trang sắc nét trên nền tối than chì.

### 4.5. Component Chi tiết sản phẩm & Tùy biến (Product Detail Components)
- **`components/SingleProductDynamicFields.tsx`**:
  - Tự động nhận diện danh sách biến thể từ database (Kích thước, Màu sắc, Chất liệu).
  - Khung xem trước mô phỏng chữ khắc theo thời gian thực (Live Preview Box).
  - Ô nhập chữ tùy biến (`customText`), lựa chọn kiểu phông (`customFont`) và URL mã QR (`customQrUrl`).
  - Nút thêm vào giỏ hàng và đặt hàng ngay với cảnh báo khi hết hàng hoặc biến thể không khả dụng.
- **`components/ProductTabs.tsx`**: Hệ thống tab chi tiết: "Mô tả sản phẩm" và "Thông số kỹ thuật & Hướng dẫn sử dụng".

### 4.6. Component Quản trị (Admin Components)
- **`components/DashboardSidebar.tsx`**: Menu điều hướng quản trị với màu than chì `#1E2229` và nhãn chức năng tiếng Việt.
- **`components/StatsElement.tsx`**: Thẻ thống kê doanh thu, số đơn hàng, khách hàng mới.
- **`components/DashboardProductTable.tsx` & `components/AdminOrders.tsx`**: Bảng quản lý đơn hàng và sản phẩm với định dạng tiền VND và trạng thái chuẩn.

---

## 5. BẢO TOÀN NGHIỆP VỤ & TÍNH TOÀN VẸN HỆ THỐNG

Việc thiết kế lại giao diện tuân thủ nghiêm ngặt nguyên tắc **Zero-Breaking-Change** đối với logic backend, cơ sở dữ liệu và các quy tắc nghiệp vụ đã hoàn thành ở các giai đoạn trước:

1. **Single Source of Truth (SSOT) cho Giá và Tồn kho:**
   - Frontend không can thiệp, không tính toán sai lệch hay ghi đè giá sản phẩm.
   - Giá hiển thị trên card sản phẩm là giá khởi điểm được lấy từ biến thể hợp lệ nhỏ nhất (`ProductVariant.price`).
   - Tồn kho và trạng thái cho phép đặt trước (`allowPreorder`) được kiểm tra trực tiếp từ `ProductVariant.stockQuantity` và `ProductVariant.allowPreorder`.
2. **Quy tắc Miễn phí Vận chuyển (Shipping Rule):**
   - Đơn hàng có tổng tiền hàng $\ge 300.000$ ₫ được áp dụng mức phí vận chuyển là `0 ₫`.
   - Đơn hàng có tổng tiền hàng $< 300.000$ ₫ được tính phí vận chuyển cố định là `30.000 ₫`.
   - Quy tắc này được đồng bộ chuẩn xác từ giao diện Giỏ hàng (`/cart`), Thanh toán (`/checkout`) đến Backend Order Controller.
3. **Quy trình Thanh toán COD & Tính toàn vẹn Dữ liệu:**
   - Form thanh toán COD tại `/checkout` gửi đầy đủ các trường: `customerName`, `customerPhone`, `customerEmail`, `shippingAddress`, `orderNotes`.
   - Dữ liệu tùy biến từng món hàng (`customText`, `customFont`, `customQrUrl`) được đóng gói nguyên vẹn trong payload `items`.
   - Header `idempotency-key` được sinh bằng `uuidv4()` và lưu tạm để ngăn chặn việc người dùng click đúp tạo đơn hàng trùng lặp.
4. **Hỗ trợ Mô hình 3D AR/VR:**
   - Trường dữ liệu `glbUrl` và `usdzUrl` của sản phẩm được giữ nguyên cấu trúc, hỗ trợ kích hoạt trình xem WebXR trên thiết bị di động.
5. **Cơ chế Xác thực & API Contracts:**
   - Toàn bộ endpoint backend (`/api/products`, `/api/orders`, `/api/orders/lookup`, `/api/auth`) và Prisma schema đều được bảo toàn 100%, không phát sinh mâu thuẫn hay lỗi giao tiếp dữ liệu.

---

## 6. SỬ DỤNG HÌNH ẢNH VÀ QUẢN LÝ TÀI NGUYÊN

- **Hình ảnh hiện có:** Dự án sử dụng hệ thống ảnh tĩnh có sẵn trong thư mục `public/` (ảnh banner và minh họa sản phẩm) kết hợp cùng hiệu ứng đồ họa CSS (gradient, backdrop-filter, border-radius) để thể hiện các góc nhìn sản phẩm in 3D.
- **Sản phẩm từ Database:** Với các sản phẩm thực tế được lấy từ database qua API `/api/products`, giao diện tự động render ảnh thông qua component `Image` của Next.js với thuộc tính bo góc và tỉ lệ khung hình `aspect-square`.
- **Trường hợp ảnh bị thiếu (Fallback):** Đã thiết lập icon dự phòng và hình khối lập phương 3D tinh gọn để giao diện luôn liền mạch, không bị vỡ layout khi dữ liệu hình ảnh đang cập nhật.

---

## 7. KẾT QUẢ KIỂM THỬ VÀ PRODUCTION BUILD

### 7.1. Kiểm tra tĩnh TypeScript (`tsc --noEmit`)
- Kết quả: **Thành công 100% (0 errors, 0 warnings)**.
- Toàn bộ các interface, kiểu dữ liệu giỏ hàng, thông tin biến thể, props của component và route handlers đều đồng bộ kiểu dữ liệu.

### 7.2. Production Build (`npx next build`)
- Trạng thái: **Thành công (Command exited with code 0)**.
- Thời gian biên dịch: **19.3 giây**.
- Tổng số route được khởi tạo: **24 routes** (Bao gồm đầy đủ các trang khách hàng và trang quản trị).
- Chi tiết kích thước Bundle:
  - First Load JS dùng chung cho toàn ứng dụng: **102 kB** (tối ưu, tải trang siêu tốc).
  - Dynamic App Routes: dao động từ 119 kB đến 191 kB.

---

## 8. CÁC VẤN ĐỀ CÒN TỒN TẠI (NẾU CÓ) VÀ GHI CHÚ

1. **Cảnh báo React Hook Dependencies ở một số trang Admin cũ:**
   - Trong quá trình build, Next.js đưa ra cảnh báo (`Warning: React Hook useEffect has a missing dependency`) tại một vài trang admin cũ (như `admin/merchant/[id]`, `admin/products/new`). Các cảnh báo này thuộc mã nguồn gốc của hệ thống quản trị cũ, không gây gián đoạn hoạt động và không ảnh hưởng đến trải nghiệm mua hàng phía khách hàng.
2. **Thẻ `<img>` ở slider cũ:**
   - Component `SimpleSlider.tsx` cũ dùng thẻ `<img>` thay vì `<Image />` của Next.js. Tuy nhiên slider này hiện đã được thay thế bằng Hero banner mới trên trang chủ, file chỉ còn được giữ lại để tương thích ngược.

---

## 9. ĐỀ XUẤT CẢI TIẾN TRONG TƯƠNG LAI

1. **Bộ xem 3D tương tác thời gian thực (Interactive 3D Viewer):**
   - Tích hợp thư viện `@google/model-viewer` hoặc `three.js` để khách hàng có thể xoay 360 độ và phóng to thu nhỏ mô hình móc khóa trực tiếp trên trình duyệt.
2. **Bộ mô phỏng màu vật liệu nhựa in (Filament Selector):**
   - Mở rộng bảng chọn màu với các hiệu ứng vật liệu đặc thù của in 3D: Nhựa PLA đổi màu theo nhiệt độ, PETG trong suốt, PLA lấp lánh (Glitter), hoặc nhựa dạ quang phát sáng trong bóng tối.
3. **Trình tạo mã QR tùy biến:**
   - Cho phép người dùng nhập trực tiếp thông tin (Link Facebook, Zalo, Số điện thoại khẩn cấp cho thú cưng), hệ thống tự động vẽ mã QR lên bề mặt mô hình 3D của móc khóa.
4. **Cổng thanh toán trực tuyến:**
   - Tích hợp thêm MoMo / VNPay Sandbox vào Phase tiếp theo để đa dạng hóa phương thức thanh toán bên cạnh COD.

---

> **Kết luận:** Giao diện website đã được lột xác hoàn toàn từ một cửa hàng công nghệ tiếng Anh cũ kỹ sang một thương hiệu eCommerce in 3D & cá nhân hóa hiện đại, thẩm mỹ, chuẩn tiếng Việt và sẵn sàng phục vụ người dùng.

