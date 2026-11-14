"use client";

import Link from "next/link";
import React from "react";
import { FaBagShopping } from "react-icons/fa6";
import { useProductStore } from "@/app/_zustand/store";

const CartElement = () => {
  const { allQuantity } = useProductStore();

  return (
    <div className="relative">
      <Link
        href="/cart"
        className="flex items-center justify-center p-2 rounded-full text-[#1E2229] hover:text-[#E06D53] hover:bg-gray-100/60 transition-colors"
        title="Giỏ hàng"
        aria-label="Giỏ hàng"
      >
        <FaBagShopping className="text-xl" />
        {allQuantity > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 bg-[#E06D53] text-white text-[11px] font-bold rounded-full flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
            {allQuantity > 99 ? "99+" : allQuantity}
          </span>
        )}
      </Link>
    </div>
  );
};

export default CartElement;