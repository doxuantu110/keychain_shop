# BÁO CÁO TÍCH HỢP SẢN PHẨM THỰC TẾ
## MÓC KHÓA 3D THẺ BÀI – CRAFT3D BOUTIQUE BRAND STORE

**Dự án:** Website Thương Mại Điện Tử Móc Khóa & Bảng Tên Cá Nhân Hóa In 3D  
**Workspace:** `D:\shop` (Next.js 15 App Router Frontend) & `D:\shop\server` (Node.js/Express + Prisma MySQL Backend)  
**Sản phẩm tích hợp:** **Móc khóa 3D thẻ bài** (Slug: `moc-khoa-3d-the-bai`)  
**Ngày hoàn thành:** 14/11/2026  
**Trạng thái kiểm tra:** TypeScript passed (0 errors), Next.js Build passed (Exit code 0, 24/24 routes), Database & COD Test Order passed (100% success)

---

## 1. THÔNG TIN BẢN GHI SẢN PHẨM (PRODUCT RECORD)

Bản ghi sản phẩm đã được tạo thành công trong cơ sở dữ liệu MySQL qua Prisma Client, tuân thủ đúng cấu trúc Single Source of Truth (SSOT):

- **Product ID:** `f81ee128-6463-4855-8871-3b63a3c29fb4`
- **Tên sản phẩm:** **Móc khóa 3D thẻ bài**
- **Slug định danh:** `moc-khoa-3d-the-bai` (URL: `/product/moc-khoa-3d-the-bai`)
- **Ảnh đại diện chính (`mainImage`):** `images/products/keychain-the-bai-front-back.jpg`
- **Giá khởi điểm hiển thị (`price`):** `45.000 ₫` (Đồng bộ với biến thể thấp nhất đang kích hoạt)
- **Danh mục (`categoryId`):** `moc-khoa-3d` (ID: `c9d27047-d378-4b86-b368-d1dc76f9d938`)
- **Nhà sản xuất (`manufacturer`):** `Craft3D Studio`
- **Đánh giá (`rating`):** `5`
- **Mô tả sản phẩm:** *"Móc khóa 3D thẻ bài lấy cảm hứng từ thẻ bùa và ngọc bội cổ phong kết hợp họa tiết mây vân truyền thống và vầng trăng khuyết huyền bí. Sản phẩm được tạo mẫu số hóa bằng công nghệ CAD 3D và in nổi từng lớp chi tiết siêu mịn 0.16mm từ chất liệu nhựa sinh học PLA cao cấp. Mặt trước nổi bật với biểu tượng cổ phong sắc nét; mặt sau được thiết kế phẳng mịn, lý tưởng để khắc tên cá nhân hóa, số điện thoại hoặc mã QR theo yêu cầu riêng của bạn."*
- **Khả năng cá nhân hóa (`isCustomizable`):** `true` (Hỗ trợ khắc chữ tối đa 30 ký tự, lựa chọn font chữ và mã QR)
- **Trạng thái kích hoạt (`isActive`):** `true`
- **Trạng thái kho (`inStock`):** `1`
- **Tính năng AR (`arEnabled`):** `true` (Cổng tích hợp WebXR & Quick Look sẵn sàng)
- **Merchant ID:** `1` (`Demo Merchant` / `Craft3D Studio`)

> **Lưu ý về sản phẩm cũ:** 12 bản ghi sản phẩm đồ điện tử cũ (smartphone, laptop...) đã được cập nhật `isActive: false` để ẩn hoàn toàn khỏi Storefront công khai. Dữ liệu lịch sử, đơn hàng cũ và migration vẫn được bảo toàn nguyên vẹn 100% (không xóa, không reset database).

---

## 2. QUẢN LÝ VÀ PHÂN VAI HÌNH ẢNH SẢN PHẨM (IMAGE MANAGEMENT)

Hệ thống sử dụng đúng 3 hình ảnh gốc do người dùng cung cấp trong thư mục `public/images/products/`, đại diện cho **CÙNG MỘT SẢN PHẨM DUY NHẤT**:

| STT | Tên file ảnh | Định dạng & Kích thước | Phân vai chức năng trong hệ thống |
| :---: | :--- | :--- | :--- |
| 1 | `keychain-the-bai-front-back.jpg` | JPG (960 × 1280 px) | **Ảnh đại diện ưu tiên trên Homepage Hero, Showcase và Product Listing (`/shop`).** Cho khách hàng thấy rõ tổng thể sản phẩm gồm cả hai mặt (mặt trước hoa văn nổi và mặt sau trơn sẵn sàng khắc tên). |
| 2 | `keychain-the-bai-detail.jpg` | JPG (960 × 1280 px) | **Ảnh chi tiết trong Product Gallery.** Chụp cận cảnh bề mặt in 3D thực tế, thể hiện rõ độ mịn của lớp in 0.16mm, họa tiết mây vân và biểu tượng trăng khuyết sắc nét. |
| 3 | `keychain-the-bai-3d-render.jpg` | JPG/PNG (246 × 310 px) | **Bản vẽ thiết kế CAD/3D trong Gallery.** Trình bày kỹ thuật ba góc độ chính xác: Mặt trước, Mặt sau và Cạnh bên kèm khoen móc kim loại. |

### Các tiêu chuẩn hiển thị đã xử lý:
- **Không méo tỷ lệ và không crop hình:** Sử dụng thuộc tính `object-contain` trên toàn bộ các thẻ hiển thị ảnh. Toàn bộ phần khoen tròn móc khóa phía trên và chóp nhọn phong thủy phía dưới đều được hiển thị đầy đủ, không bị cắt xén.
- **Tối ưu hóa Next.js Image:** Áp dụng component `<Image />` với cờ `priority` cho ảnh hero và gallery chính, đảm bảo tốc độ tải trang nhanh và chuẩn Web Vitals.
- **Tính năng xem phóng to (Lightbox Zoom):** Khách hàng có thể nhấn vào biểu tượng kính lúp hoặc nhấp đúp vào ảnh để mở popup phóng to toàn màn hình, kiểm tra rõ từng đường nét in 3D.
- **Thumbnail chuyển đổi mượt mà:** Khối thumbnail phía dưới cho phép chuyển đổi tức thì giữa 3 ảnh kèm nhãn phân biệt ("Tổng thể 2 mặt", "Chi tiết in 3D", "Bản vẽ 3D CAD").

---

## 3. CÁC TRANG VÀ COMPONENT ĐÃ CẬP NHẬT

### 3.1. Homepage (`/`)
- **Hero Banner:**
  - Headline đúng chuẩn: *"Một dấu ấn nhỏ, mang phong cách riêng."*
  - Subtitle: *"Khám phá móc khóa 3D thẻ bài với thiết kế độc đáo, tinh xảo trong từng chi tiết. Chế tác bằng công nghệ in 3D độ nét cao, hỗ trợ khắc tên và tùy biến cá nhân hóa độc nhất."*
  - CTA chính: *"Khám phá sản phẩm"* (Dẫn thẳng tới trang chi tiết Móc khóa 3D thẻ bài).
  - Khung ảnh hiển thị ảnh chụp thật `keychain-the-bai-front-back.jpg` với huy hiệu *"Ảnh Thực Tế Từ Xưởng In"*.
- **Featured Product Showcase:**
  - Tiêu đề: *"Sản phẩm nổi bật"*.
  - Bố cục Showcase rộng rãi (`max-w-5xl mx-auto`), không cố tạo grid giả lấp đầy giao diện.
  - Cột trái: Ảnh sản phẩm lớn sắc nét, huy hiệu *"Ảnh thực tế"* và *"Khắc tên theo yêu cầu"*.
  - Cột phải: Tên sản phẩm, mô tả truyền cảm hứng, 4 thẻ thông số kỹ thuật (in 3D 0.16mm, nhựa PLA an toàn, khoen kim loại, khắc tên & QR), giá bán thực tế lấy từ API backend (`45.000 ₫`), nút *"Xem chi tiết & Tùy biến"* và *"Mua ngay"*.
- **Các phân khu tiếp theo:** Thử nghiệm cá nhân hóa trực tiếp (`CustomizationHighlight`), Câu chuyện thương hiệu xưởng in (`IntroducingSection`), Quy trình sản xuất 4 bước in 3D (`ProcessSection`), Cam kết chất lượng (`Incentives`), Kêu gọi hành động (`BoutiqueCTA`) và Bản tin. Không có Category Menu thừa.

### 3.2. Product Listing (`/shop`)
- Loại bỏ toàn bộ sidebar bộ lọc danh mục và đánh giá phức tạp.
- Trình bày dạng Boutique Grid sang trọng, chính giữa là thẻ sản phẩm lớn của **Móc khóa 3D thẻ bài**.
- Thẻ sản phẩm hiển thị đầy đủ ảnh thật, tên, nhãn *"In 3D FDM"*, trích đoạn mô tả ngắn, giá khởi điểm *"Từ 45.000 ₫"* và nút hành động *"Tùy biến ngay"*.
- Nhấp vào sản phẩm điều hướng chính xác tới `/product/moc-khoa-3d-the-bai`.

### 3.3. Product Detail (`/product/moc-khoa-3d-the-bai`)
- **Bố cục chuẩn mực:**
  - Desktop: Gallery 3 ảnh tương tác bên trái (tích hợp thumbnail chuyển ảnh, nút zoom phóng to và nút xem 3D/AR), cột thông tin & mua hàng bên phải.
  - Mobile: Gallery phía trên, thông tin đặt hàng phía dưới.
- **Tương tác mua hàng (`SingleProductDynamicFields`):**
  - Hiển thị giá và tồn kho đồng bộ thời gian thực theo biến thể được chọn.
  - Chọn kích thước: `Tiêu chuẩn (10cm)` hoặc `Bản lớn (15cm)`.
  - Ô nhập nội dung khắc tên cá nhân hóa (`customText`), chọn kiểu phông chữ nghệ thuật (`customFont`) và ô nhập URL mã QR (`customQrUrl`).
  - Khung mô phỏng xem trước chữ khắc (Live Mockup Box).
  - Nút *"Thêm vào giỏ hàng"* và *"Mua ngay"* (chuyển thẳng sang trang thanh toán `/checkout`).
- **Hệ thống Tab chi tiết (`ProductTabs`):**
  - Tab "Mô tả chi tiết": Thuyết minh câu chuyện thiết kế thẻ bài cổ phong và công nghệ in 3D.
  - Tab "Thông số kỹ thuật & Chế tác": Bảng thông số vật liệu nhựa sinh học PLA, độ phân giải lớp in, quy định ký tự khắc tên và trạng thái 3D/AR.

### 3.4. Cart & Checkout COD Flow
- **Giỏ hàng (`/cart`):** Hiển thị đúng ảnh `keychain-the-bai-front-back.jpg`, tên sản phẩm, kích thước biến thể, chi tiết chữ khắc và mã QR. Tự động kiểm tra điều kiện Freeship (Miễn phí vận chuyển nếu đơn hàng $\ge 300.000$ ₫; tính 30.000 ₫ nếu $< 300.000$ ₫).
- **Thanh toán COD (`/checkout`):** Form nhập thông tin nhận hàng tiếng Việt chuẩn hóa, tóm tắt đơn hàng với ảnh thu nhỏ rõ ràng, gửi kèm `idempotency-key` chống trùng lặp đơn hàng.
- **Trang xác nhận & Tra cứu đơn (`/order-confirmation`, `/order-lookup`):** Hiển thị mã đơn hàng dạng `MK-YYMMDD-XXXX`, tiến độ chuẩn bị hàng in 3D thủ công và đầy đủ snapshot chữ khắc.

---

## 4. CẤU HÌNH BIẾN THỂ, KÍCH THƯỚC VÀ GIÁ BÁN (VARIANTS & PRICING)

Biến thể được cấu hình trong bảng `ProductVariant` làm nguồn dữ liệu duy nhất (SSOT) cho giá bán và tồn kho:

| Tên biến thể (Size Label) | Variant Key | SKU | Giá bán (VND) | Tồn kho | Cho phép Preorder | Trạng thái |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Tiêu chuẩn (10cm)** | `size:10cm\|color:trang-nga\|mat:pla` | `CRAFT3D-THEBAI-10CM-WHT` | **45.000 ₫** | 20 | Bật (`true`) | Kích hoạt (`isActive: true`) |
| **Bản lớn (15cm)** | `size:15cm\|color:trang-nga\|mat:pla` | `CRAFT3D-THEBAI-15CM-WHT` | **65.000 ₫** | 15 | Bật (`true`) | Kích hoạt (`isActive: true`) |

> **Ghi chú quan trọng:** Mức giá `45.000 ₫` và `65.000 ₫` cùng số lượng tồn kho trên được thiết lập làm giá trị thử nghiệm (benchmark test) trên database development để phục vụ kiểm thử luồng mua hàng và kiểm tra tính toán tổng tiền. Đây chưa phải là bảng giá bán lẻ chính thức của cửa hàng.

---

## 5. TÌNH TRẠNG TÍCH HỢP VTO / AR (VIRTUAL TRY-ON & 3D)

Thực hiện đúng nguyên tắc minh bạch, không dùng ảnh 2D tĩnh để giả lập tính năng VTO 3D:

1. **Khảo sát hệ thống asset hiện tại:**
   - Trong kho mã nguồn hiện **chưa có file mô hình 3D thực tế** (định dạng `.glb` cho Android / WebXR hoặc `.usdz` cho iOS Quick Look).
   - Ảnh số 3 (`keychain-the-bai-3d-render.jpg`) là ảnh kết xuất CAD 3 góc độ (Mặt trước, Mặt sau, Cạnh bên) được tích hợp trong thư viện ảnh để người dùng quan sát hình học sản phẩm.
2. **Cơ chế giao diện & Cổng kỹ thuật:**
   - Trường dữ liệu `arEnabled: true`, `glbUrl` và `usdzUrl` đã được khai báo sẵn sàng trong database và API response.
   - Nút *"Trải nghiệm 3D / AR"* trên giao diện Product Gallery mở popup thông tin hướng dẫn rõ ràng: giải thích về bản vẽ CAD 3 góc độ hiện có và thông báo tính năng AR không gian thực sẽ tự động kích hoạt ngay khi xưởng thiết kế nạp file `.glb` / `.usdz`.
   - Trải nghiệm mua sắm, chọn biến thể và đặt hàng COD hoạt động độc lập, không bị ảnh hưởng.

---

## 6. KẾT QUẢ KIỂM THỬ HỆ THỐNG (TESTING & VERIFICATION)

### 6.1. Kiểm tra tĩnh TypeScript
```bash
npx tsc --noEmit
```
- **Kết quả:** **0 errors, 0 warnings**. Toàn bộ kiểu dữ liệu của Product, ProductVariant, CartItem, OrderSnapshot và Gallery props đồng bộ hoàn hảo.

### 6.2. Kiểm tra biên dịch Next.js Production Build
```bash
npx next build
```
- **Kết quả:** **Biên dịch thành công 24/24 routes (Exit code 0)**.
- First Load JS toàn hệ thống tối ưu ở mức **102 kB**.
- Tuyến `/product/[productSlug]` và `/shop/[[...slug]]` được render động theo yêu cầu (Dynamic Server-rendered on demand).

### 6.3. Kiểm thử đặt hàng COD thực tế trên Database Development
Đã thực thi kịch bản kiểm thử toàn diện quy trình mua hàng qua script `test_cod_order.js`:
- **Sản phẩm kiểm thử:** Móc khóa 3D thẻ bài (ID: `f81ee128-6463-4855-8871-3b63a3c29fb4`).
- **Biến thể chọn mua:** Tiêu chuẩn (10cm) – Đơn giá: `45.000 ₫` – Số lượng: `2`.
- **Dữ liệu cá nhân hóa:**
  - Chữ khắc: `"MINH ANH"`
  - Kiểu phông: `"Playfair Display"`
  - Mã QR URL: `"https://facebook.com/minhanh"`
- **Tính toán tài chính backend:**
  - Tiền hàng (Subtotal): $45.000 \times 2 = 90.000\text{ ₫}$
  - Phí giao hàng: $30.000\text{ ₫}$ (Do tổng tiền hàng $< 300.000\text{ ₫}$)
  - Tổng thanh toán COD: $120.000\text{ ₫}$
- **Bản ghi đơn hàng tạo thành công:** Mã đơn **`MK-261114-D36A`** (ID: `7c3ae244-0061-4e11-9aec-b2649a85b260`).
- **Kiểm tra truy vấn (Order Lookup):** Tra cứu đơn hàng theo mã `MK-261114-D36A` trả về chính xác 100% dữ liệu: thông tin khách hàng, chi tiết sản phẩm, snapshot chữ khắc, mã QR và lịch sử trạng thái đơn hàng `PROCESSING`.

---

## 7. CÁC THÔNG TIN CẦN NGƯỜI DÙNG XÁC NHẬN CHÍNH THỨC

Trước khi công bố chính thức (Public Launch) sản phẩm ra thị trường, người dùng cần xác nhận và bổ sung:

1. **Bảng giá bán lẻ chính thức:**
   - Xác nhận giá bán chính thức cho từng kích thước (ví dụ bản 10cm và 15cm).
   - Xác nhận có áp dụng phụ phí cho dịch vụ khắc mã QR hoặc khắc 2 mặt hay không (hiện tại đang miễn phí theo giá biến thể).
2. **Chính sách kho hàng & Đặt trước (Pre-order):**
   - Xác nhận số lượng hàng có sẵn trong kho (stock sẵn) hay vận hành theo mô hình 100% chế tác theo đơn đặt hàng (`allowPreorder = true` với thời gian chuẩn bị 1–2 ngày).
3. **Tùy chọn màu sắc & chất liệu:**
   - Xác nhận các màu nhựa in PLA sẽ cung cấp ngoài màu Trắng ngà (Moon White) gốc (ví dụ: Đen nhám, Vàng đồng, Bạc metallic, Đỏ ngọc...).
4. **File 3D Model cho VTO/AR:**
   - Cung cấp file mô hình 3D thực tế định dạng `.glb` và `.usdz` của Móc khóa 3D thẻ bài nếu muốn người dùng có thể kích hoạt camera xoay mô hình 360 độ trên không gian thực.

---

## 8. CÁC VẤN ĐỀ CHƯA HOÀN THÀNH & ĐỀ XUẤT TIẾP THEO

1. **File 3D Model (`.glb` / `.usdz`):** Đang chờ file xuất từ phần mềm CAD (Blender/Fusion360) của đội ngũ thiết kế để đưa vào thư mục `public/models/`. Hệ thống UI và Database đã sẵn sàng nhận file bất cứ lúc nào.
2. **Cổng thanh toán online:** Hiện tại hệ thống đang vận hành hoàn hảo với phương thức thanh toán **COD (Thanh toán khi nhận hàng)**. Trong giai đoạn sau có thể tích hợp thêm MoMo/VNPay Sandbox.

---

> **Kết luận:** Sản phẩm thực tế **Móc khóa 3D thẻ bài** đã được đưa vào hệ thống kinh doanh của Craft3D một cách toàn diện: từ hình ảnh chụp thật sắc nét, thẻ showcase nổi bật trên Trang chủ, trang Cửa hàng tinh giản, đến trang Chi tiết sản phẩm chuyên nghiệp, giỏ hàng và quy trình đặt đơn COD hoạt động chính xác 100%.

