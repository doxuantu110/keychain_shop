"use client";

import React from "react";
import Link from "next/link";
import { categoryMenuList } from "@/lib/utils";
import { FaCube, FaArrowRight, FaSignature, FaShieldCat, FaCar, FaIdCard, FaGift } from "react-icons/fa6";

const categoryIcons: Record<number, React.ReactNode> = {
  1: <FaSignature className="text-2xl text-[#E06D53]" />,
  2: <FaShieldCat className="text-2xl text-[#E06D53]" />,
  3: <FaCar className="text-2xl text-[#E06D53]" />,
  4: <FaIdCard className="text-2xl text-[#E06D53]" />,
  5: <FaGift className="text-2xl text-[#E06D53]" />,
};

const CategoryMenu = () => {
  return (
    <section className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-[#E7E5E4]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3 py-1 rounded-full inline-block mb-2">
              Danh Mục Sản Phẩm
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] tracking-tight">
              Bộ Sưu Tập Phụ Kiện In 3D
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1E2229] hover:text-[#E06D53] transition-colors"
          >
            <span>Xem tất cả danh mục</span>
            <FaArrowRight className="text-xs" />
          </Link>
        </div>

        {/* Lưới danh mục 5 cột hoặc responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {categoryMenuList.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="bg-white rounded-2xl p-6 border border-[#E7E5E4] hover:border-[#E06D53]/60 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FDF2EE] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#E06D53] group-hover:text-white transition-all shadow-sm">
                <span className="group-hover:text-white transition-colors">
                  {categoryIcons[item.id] || <FaCube className="text-2xl text-[#E06D53]" />}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#1E2229] group-hover:text-[#E06D53] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryMenu;