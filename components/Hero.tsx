"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import { FaCube, FaWandMagicSparkles, FaArrowRight, FaCheck, FaShieldHalved } from "react-icons/fa6";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF9F6] to-[#F5F3EF] py-12 sm:py-16 lg:py-24 border-b border-[#E7E5E4]">
      {/* Họa tiết nền trang trí nhẹ nhàng */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-[#E06D53]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-[#1E2229]/5 blur-3xl pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* CỘT NỘI DUNG CHÍNH */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF2EE] border border-[#E06D53]/20 text-[#E06D53] text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
              <FaWandMagicSparkles className="text-sm" />
              <span>Xưởng Chế Tác & In 3D Độc Bản Craft3D</span>
            </div>

            {/* Headline chuẩn theo yêu cầu */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1E2229] tracking-tight leading-[1.18]">
              Một dấu ấn nhỏ, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E06D53] via-[#F97316] to-[#C85A42]">
                mang phong cách riêng.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Khám phá móc khóa 3D thẻ bài với thiết kế độc đáo, tinh xảo trong từng chi tiết. Chế tác bằng công nghệ in 3D độ nét cao, hỗ trợ khắc tên và tùy biến cá nhân hóa độc nhất.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
              <Link
                href="/product/moc-khoa-3d-the-bai"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#1E2229] text-white font-semibold text-sm hover:bg-[#E06D53] shadow-sm transition-all hover:translate-y-[-1px]"
              >
                <span>Khám phá sản phẩm</span>
                <FaArrowRight className="text-xs" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
              >
                <FaCube className="text-[#E06D53]" />
                <span>Xem bộ sưu tập Craft3D</span>
              </Link>
            </div>

            {/* Điểm nổi bật dưới CTA */}
            <div className="mt-10 pt-8 border-t border-gray-200/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-gray-600 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                  <FaCheck />
                </span>
                <span>In 3D nét cao 0.16mm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                  <FaCheck />
                </span>
                <span>Khắc tên & biểu tượng</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                  <FaCheck />
                </span>
                <span>Kiểm tra hàng (COD)</span>
              </div>
            </div>
          </div>

          {/* CỘT HÌNH ẢNH SẢN PHẨM THẬT (Ưu tiên ảnh front-back) */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="w-full max-w-[440px] bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xl shadow-stone-200/60 relative">
              {/* Thẻ trạng thái sản phẩm thật */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Ảnh Thực Tế Từ Xưởng In</span>
                </div>
                <span className="text-[11px] font-medium bg-[#FDF2EE] text-[#E06D53] px-2.5 py-1 rounded-full">
                  Móc khóa 3D thẻ bài
                </span>
              </div>

              {/* Khung hiển thị ảnh thật - object-contain, không crop mất móc hay chóp nhọn */}
              <Link href="/product/moc-khoa-3d-the-bai" className="block mt-4 group">
                <div className="relative aspect-[4/5] sm:aspect-square w-full rounded-2xl bg-[#FAF9F6] border border-gray-100 overflow-hidden flex items-center justify-center p-3">
                  <Image
                    src="/images/products/keychain-the-bai-front-back.jpg"
                    alt="Móc khóa 3D thẻ bài - Mặt trước và mặt sau"
                    width={480}
                    height={640}
                    priority
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay badge */}
                  <div className="absolute top-3 left-3 bg-[#1E2229]/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1.5">
                    <FaCube className="text-[#E06D53]" />
                    <span>Hai Mặt Sắc Nét</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#1E2229] text-base group-hover:text-[#E06D53] transition-colors">
                      Móc khóa 3D thẻ bài
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Họa tiết mây vân cổ phong & vầng trăng khuyết
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Giá từ</span>
                    <span className="text-base font-extrabold text-[#1E2229]">45.000 ₫</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
