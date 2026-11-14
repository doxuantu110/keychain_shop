"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FaTrashCan, FaArrowRight } from "react-icons/fa6";
import { formatVND } from "@/types/cart";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";

interface WishItemProps {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailabillity: number;
}

const WishItem: React.FC<WishItemProps> = ({
  id,
  title,
  price,
  image,
  slug,
  stockAvailabillity,
}) => {
  const { wishlist, setWishlist } = useWishlistStore();

  const handleRemove = () => {
    setWishlist(wishlist.filter((item) => item.id !== id));
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-gray-200 bg-[#FAF9F6] p-1 flex-shrink-0 flex items-center justify-center">
            <Image
              src={image ? `/${image}` : "/product_placeholder.jpg"}
              alt={title || "Móc khóa in 3D"}
              width={56}
              height={56}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <Link
              href={`/product/${slug}`}
              className="font-bold text-[#1E2229] hover:text-[#E06D53] transition-colors line-clamp-1"
            >
              {title}
            </Link>
          </div>
        </div>
      </td>
      <td>
        {stockAvailabillity > 0 ? (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Còn hàng
          </span>
        ) : (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
            Hết hàng
          </span>
        )}
      </td>
      <td className="font-extrabold text-[#1E2229]">
        {formatVND(price)}
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Link
            href={`/product/${slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1E2229] hover:bg-[#E06D53] text-white text-xs font-semibold transition-all shadow-xs"
          >
            <span>Xem</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
          <button
            onClick={handleRemove}
            type="button"
            className="text-gray-400 hover:text-rose-600 transition-colors p-2"
            title="Xóa khỏi yêu thích"
            aria-label="Xóa"
          >
            <FaTrashCan className="text-xs" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default WishItem;