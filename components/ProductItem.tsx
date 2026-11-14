"use client";

import Image from "next/image";
import React from "react";
import Link from "next/link";
import { sanitize } from "@/lib/sanitize";
import { formatVND } from "@/types/cart";
import { Product } from "@/types/product";
import { FaCube, FaWandMagicSparkles, FaArrowRight, FaCheck } from "react-icons/fa6";

interface ProductItemProps {
  product: Product;
  color?: string;
  isLarge?: boolean;
}

const ProductItem: React.FC<ProductItemProps> = ({ product, isLarge = false }) => {
  const isOutOfStock = product.inStock === 0;

  // Rút gọn mô tả sạch không chứa HTML
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>?/gm, "").slice(0, 140) + "..."
    : "Sản phẩm móc khóa in 3D cá nhân hóa độc bản, hoàn thiện thủ công tỉ mỉ.";

  return (
    <div className={`group relative flex flex-col justify-between w-full h-full bg-white rounded-3xl border border-[#E7E5E4] hover:border-[#E06D53]/60 hover:shadow-xl transition-all duration-300 overflow-hidden ${isLarge ? "p-6 sm:p-7" : "p-5"}`}>
      {/* KHỐI ẢNH VÀ BADGES */}
      <div>
        <div className="relative aspect-square w-full rounded-2xl bg-[#FAF9F6] border border-gray-100 overflow-hidden flex items-center justify-center p-4">
          <Link href={`/product/${product.slug}`} className="w-full h-full flex items-center justify-center">
            <Image
              src={
                product.mainImage
                  ? product.mainImage.startsWith("/")
                    ? product.mainImage
                    : `/${product.mainImage}`
                  : "/images/products/keychain-the-bai-front-back.jpg"
              }
              alt={sanitize(product.title) || "Móc khóa in 3D cá nhân hóa"}
              width={500}
              height={500}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Badges nổi bật góc ảnh */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.isCustomizable && (
              <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[#E06D53] border border-[#E06D53]/20 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm">
                <FaWandMagicSparkles className="text-[10px]" /> Khắc tên theo yêu cầu
              </span>
            )}
            {product.arEnabled && (
              <span className="inline-flex items-center gap-1.5 bg-[#1E2229]/90 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm">
                <FaCube className="text-[10px] text-[#E06D53]" /> Trải nghiệm 3D / AR
              </span>
            )}
          </div>

          {/* Badge hết hàng */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center z-20">
              <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow">
                Tạm thời hết hàng
              </span>
            </div>
          )}
        </div>

        {/* THÔNG TIN SẢN PHẨM */}
        <div className="mt-5 flex flex-col gap-y-2">
          {/* Tag Studio */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-2.5 py-0.5 rounded-full">
              Chế tác in 3D
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">Độ phân giải 0.16mm</span>
          </div>

          {/* Tiêu đề sản phẩm */}
          <h3 className="text-lg sm:text-xl font-extrabold text-[#1E2229] group-hover:text-[#E06D53] transition-colors leading-snug">
            <Link href={`/product/${product.slug}`}>
              {sanitize(product.title)}
            </Link>
          </h3>

          {/* Mô tả ngắn sản phẩm */}
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2 mt-0.5">
            {cleanDescription}
          </p>

          {/* Điểm nổi bật ngắn */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <FaCheck className="text-emerald-500 text-[10px]" /> Nhựa PLA sinh học
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <FaCheck className="text-emerald-500 text-[10px]" /> Khoen thép chống gỉ
            </span>
          </div>
        </div>
      </div>

      {/* GIÁ TIỀN & NÚT HÀNH ĐỘNG */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-gray-500 block leading-tight">Giá khởi điểm từ</span>
          <span className="text-xl sm:text-2xl font-black text-[#1E2229]">
            {formatVND(product.price)}
          </span>
        </div>

        <Link
          href={`/product/${product.slug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E2229] text-white text-xs sm:text-sm font-semibold hover:bg-[#E06D53] transition-all shadow-sm"
        >
          <span>Tùy biến ngay</span>
          <FaArrowRight className="text-[11px]" />
        </Link>
      </div>
    </div>
  );
};

export default ProductItem;
