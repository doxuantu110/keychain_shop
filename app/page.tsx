import {
  Hero,
  ProductsSection,
  CustomizationHighlight,
  IntroducingSection,
  ProcessSection,
  Incentives,
  BoutiqueCTA,
  Newsletter,
} from "@/components";

export default function Home() {
  return (
    <>
      {/* 1. Hero giới thiệu thương hiệu */}
      <Hero />

      {/* 2. Sản phẩm nổi bật (hiển thị trực tiếp 1–2 sản phẩm lớn & thoáng) */}
      <ProductsSection />

      {/* 3. Giới thiệu khả năng cá nhân hóa với xem trước mockup trực tiếp */}
      <CustomizationHighlight />

      {/* 4. Câu chuyện thương hiệu & Triết lý chế tác Craft3D */}
      <IntroducingSection />

      {/* 5. Quy trình sản xuất bằng công nghệ in 3D */}
      <ProcessSection />

      {/* 6. Cam kết chất lượng & dịch vụ */}
      <Incentives />

      {/* 7. CTA khám phá sản phẩm và mua hàng */}
      <BoutiqueCTA />

      {/* 8. Bản tin ưu đãi */}
      <Newsletter />
    </>
  );
}
