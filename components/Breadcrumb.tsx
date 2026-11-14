"use client";

import Link from "next/link";
import React from "react";
import { FaHouse, FaAngleRight } from "react-icons/fa6";

interface BreadcrumbProps {
  currentPage?: string;
}

const Breadcrumb = ({ currentPage = "Tất cả sản phẩm" }: BreadcrumbProps) => {
  return (
    <nav aria-label="Breadcrumb" className="py-5 text-xs sm:text-sm text-gray-500">
      <ol className="flex items-center gap-2">
        <li className="flex items-center">
          <Link href="/" className="flex items-center gap-1.5 hover:text-[#E06D53] transition-colors">
            <FaHouse className="text-xs" />
            <span>Trang chủ</span>
          </Link>
        </li>
        <li className="flex items-center text-gray-400">
          <FaAngleRight className="text-[10px]" />
        </li>
        <li className="flex items-center">
          <Link href="/shop" className="hover:text-[#E06D53] transition-colors">
            Cửa hàng
          </Link>
        </li>
        <li className="flex items-center text-gray-400">
          <FaAngleRight className="text-[10px]" />
        </li>
        <li className="font-semibold text-[#1E2229] truncate max-w-[200px] sm:max-w-none">
          {currentPage}
        </li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;