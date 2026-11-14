"use client";

import Link from "next/link";
import React from "react";
import { FaHeart } from "react-icons/fa6";

const HeartElement = ({ wishQuantity }: { wishQuantity: number }) => {
  return (
    <div className="relative">
      <Link
        href="/wishlist"
        className="flex items-center justify-center p-2 rounded-full text-[#1E2229] hover:text-[#E06D53] hover:bg-gray-100/60 transition-colors"
        title="Danh sách yêu thích"
        aria-label="Danh sách yêu thích"
      >
        <FaHeart className="text-xl" />
        {wishQuantity > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 bg-[#1E2229] text-white text-[11px] font-bold rounded-full flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
            {wishQuantity > 99 ? "99+" : wishQuantity}
          </span>
        )}
      </Link>
    </div>
  );
};

export default HeartElement;