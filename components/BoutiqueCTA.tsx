"use client";

import Link from "next/link";
import React from "react";
import { FaArrowRight, FaCube, FaWandMagicSparkles, FaShieldHeart } from "react-icons/fa6";

const BoutiqueCTA = () => {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-[#1E2229] via-[#252A33] to-[#181B20] text-white relative overflow-hidden">
      {/* Glow effect trang trí */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#E06D53]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#E06D53]/10 blur-3xl pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10 text-center">
        <div className="max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E06D53]/20 border border-[#E06D53]/30 text-[#E06D53] text-xs font-semibold mb-6">
            <FaWandMagicSparkles className="text-xs" />
            <span>Chế Tác Theo Yêu Cầu Riêng</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Sẵn sàng tạo chiếc móc khóa mang dấu ấn riêng?
          </h2>

          {/* Description */}
          <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl mx-auto">
            Chỉ mất 2 phút để nhập chữ bạn muốn khắc, lựa chọn màu sắc yêu thích và xem trước mô hình 3D. Nhận hàng tận nơi, kiểm tra trước khi thanh toán (COD).
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#E06D53] text-white font-bold text-sm hover:bg-[#c95b42] shadow-lg shadow-[#E06D53]/20 transition-all hover:translate-y-[-1px]"
            >
              <span>Khám phá sản phẩm ngay</span>
              <FaArrowRight className="text-xs" />
            </Link>
            <Link
              href="/#process"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all"
            >
              <FaCube className="text-[#E06D53]" />
              <span>Xem quy trình in 3D</span>
            </Link>
          </div>

          {/* Quick trust metrics */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Miễn phí khắc tên & số điện thoại
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E06D53]"></span>
              Freeship đơn từ 300.000 ₫
            </span>
            <span className="flex items-center gap-1.5">
              <FaShieldHeart className="text-[#E06D53]" />
              Bảo hành đổi trả 7 ngày
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoutiqueCTA;

