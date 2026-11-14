import React from "react";
import Image from "next/image";
import Link from "next/link";
import apiClient from "@/lib/api";
import { formatVND } from "@/types/cart";
import { sanitize } from "@/lib/sanitize";
import {
  FaArrowRight,
  FaCube,
  FaWandMagicSparkles,
  FaCheck,
  FaEye,
  FaBagShopping,
} from "react-icons/fa6";

const ProductsSection = async () => {
  let products = [];

  try {
    const data = await apiClient.get("/api/products");

    if (!data.ok) {
      console.error("Failed to fetch products:", data.statusText);
      products = [];
    } else {
      const result = await data.json();
      products = Array.isArray(result) ? result : [];
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    products = [];
  }

  // Lọc sản phẩm đang hoạt động (isActive)
  const activeProducts = products.filter((p: any) => p.isActive !== false);
  const featuredProduct = activeProducts[0];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E7E5E4]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3.5 py-1.5 rounded-full inline-block mb-3">
            Tác Phẩm Chủ Đạo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2229] tracking-tight">
            Sản phẩm nổi bật
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Thiết kế độc bản kết hợp giữa mỹ thuật cổ phong và công nghệ chế tác in 3D hiện đại.
          </p>
        </div>

        {/* SHOWCASE RỘNG RÃI CHO SẢN PHẨM NỔI BẬT */}
        {featuredProduct ? (
          <div className="max-w-5xl mx-auto bg-[#FAF9F6] rounded-3xl border border-[#E7E5E4] p-6 sm:p-10 shadow-sm hover:shadow-md transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* CỘT ẢNH SẢN PHẨM LỚN (Không méo, không crop mất móc hay chóp) */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-2xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center p-4 sm:p-6 group">
                  <Link href={`/product/${featuredProduct.slug}`} className="w-full h-full flex items-center justify-center">
                    <Image
                      src={
                        featuredProduct.mainImage
                          ? `/${featuredProduct.mainImage}`
                          : "/images/products/keychain-the-bai-front-back.jpg"
                      }
                      alt={sanitize(featuredProduct.title) || "Móc khóa 3D thẻ bài"}
                      width={500}
                      height={600}
                      priority
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Badges góc ảnh */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                    <span className="inline-flex items-center gap-1.5 bg-[#1E2229] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                      <FaCube className="text-[#E06D53] text-[10px]" /> Ảnh thực tế
                    </span>
                    {featuredProduct.isCustomizable && (
                      <span className="inline-flex items-center gap-1 bg-[#FDF2EE] text-[#E06D53] border border-[#E06D53]/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                        <FaWandMagicSparkles className="text-[9px]" /> Khắc tên theo yêu cầu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CỘT THÔNG TIN VÀ NÚT HÀNH ĐỘNG */}
              <div className="lg:col-span-6 flex flex-col items-start text-left">
                {/* Tag thương hiệu */}
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#E06D53] bg-white border border-gray-200 px-3 py-1 rounded-full mb-3 shadow-xs">
                  {featuredProduct.category?.name === "moc-khoa-3d"
                    ? "Móc Khóa In 3D"
                    : featuredProduct.category?.name || "Craft3D Signature"}
                </span>

                {/* Tên sản phẩm */}
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] tracking-tight leading-snug">
                  <Link href={`/product/${featuredProduct.slug}`} className="hover:text-[#E06D53] transition-colors">
                    {sanitize(featuredProduct.title)}
                  </Link>
                </h3>

                {/* Mô tả ngắn */}
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  Lấy cảm hứng từ thẻ bùa và ngọc bội cổ phong kết hợp họa tiết mây vân truyền thống và vầng trăng khuyết huyền bí. Mặt trước nổi bật với biểu tượng sắc nét; mặt sau phẳng mịn lý tưởng để khắc tên cá nhân hóa hoặc mã QR độc bản.
                </p>

                {/* Đặc tính kỹ thuật cốt lõi */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 w-full text-xs text-gray-700">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100">
                    <FaCheck className="text-emerald-500 text-[11px]" />
                    <span>In 3D nét cao 0.16mm</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100">
                    <FaCheck className="text-emerald-500 text-[11px]" />
                    <span>Nhựa sinh học PLA an toàn</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100">
                    <FaCheck className="text-emerald-500 text-[11px]" />
                    <span>Khoen móc kim loại chắc chắn</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100">
                    <FaCheck className="text-emerald-500 text-[11px]" />
                    <span>Hỗ trợ khắc tên & QR code</span>
                  </div>
                </div>

                {/* Giá bán thực tế từ API */}
                <div className="mt-6 pt-5 border-t border-gray-200/80 w-full flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">Giá khởi điểm từ</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#1E2229]">
                      {formatVND(featuredProduct.price)}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    ● Sẵn sàng chế tác theo đơn
                  </span>
                </div>

                {/* Các nút hành động */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
                  <Link
                    href={`/product/${featuredProduct.slug}`}
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#1E2229] text-white font-semibold text-sm hover:bg-[#E06D53] transition-all shadow-sm"
                  >
                    <FaEye className="text-xs" />
                    <span>Xem chi tiết & Tùy biến</span>
                  </Link>

                  <Link
                    href={`/product/${featuredProduct.slug}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                  >
                    <FaBagShopping className="text-[#E06D53] text-xs" />
                    <span>Mua ngay</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-[#FAF9F6] rounded-3xl border border-dashed border-gray-300 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl text-[#E06D53] mx-auto mb-4 border border-gray-100">
              <FaCube />
            </div>
            <h3 className="text-base font-bold text-[#1E2229]">
              Xưởng in 3D đang cập nhật sản phẩm
            </h3>
            <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
              Vui lòng quay lại sau ít phút hoặc liên hệ trực tiếp để đặt mẫu theo yêu cầu riêng!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
