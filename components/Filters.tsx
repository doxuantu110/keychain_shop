"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSortStore } from "@/app/_zustand/sortStore";
import { usePaginationStore } from "@/app/_zustand/paginationStore";
import { formatVND } from "@/types/cart";
import { FaFilter, FaCheck } from "react-icons/fa6";

interface InputCategory {
  inStock: { text: string; isChecked: boolean };
  outOfStock: { text: string; isChecked: boolean };
  priceFilter: { text: string; value: number };
  ratingFilter: { text: string; value: number };
}

const Filters = () => {
  const pathname = usePathname();
  const { replace } = useRouter();
  const { page } = usePaginationStore();
  const { sortBy } = useSortStore();

  const [inputCategory, setInputCategory] = useState<InputCategory>({
    inStock: { text: "instock", isChecked: true },
    outOfStock: { text: "outofstock", isChecked: true },
    priceFilter: { text: "price", value: 500000 },
    ratingFilter: { text: "rating", value: 0 },
  });

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("outOfStock", inputCategory.outOfStock.isChecked.toString());
    params.set("inStock", inputCategory.inStock.isChecked.toString());
    params.set("rating", inputCategory.ratingFilter.value.toString());
    params.set("price", inputCategory.priceFilter.value.toString());
    params.set("sort", sortBy);
    params.set("page", page.toString());
    replace(`${pathname}?${params.toString()}`);
  }, [inputCategory, sortBy, page]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] shadow-sm flex flex-col gap-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <FaFilter className="text-[#E06D53] text-sm" />
        <h3 className="text-base font-bold text-[#1E2229]">Bộ Lọc Sản Phẩm</h3>
      </div>

      {/* TÌNH TRẠNG KHO */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Tình trạng kho hàng
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inputCategory.inStock.isChecked}
              onChange={() =>
                setInputCategory({
                  ...inputCategory,
                  inStock: {
                    text: "instock",
                    isChecked: !inputCategory.inStock.isChecked,
                  },
                })
              }
              className="checkbox checkbox-sm rounded border-gray-300 text-[#1E2229] focus:ring-[#E06D53]"
            />
            <span>Còn hàng / Nhận đặt trước</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inputCategory.outOfStock.isChecked}
              onChange={() =>
                setInputCategory({
                  ...inputCategory,
                  outOfStock: {
                    text: "outofstock",
                    isChecked: !inputCategory.outOfStock.isChecked,
                  },
                })
              }
              className="checkbox checkbox-sm rounded border-gray-300 text-[#1E2229] focus:ring-[#E06D53]"
            />
            <span>Hết hàng</span>
          </label>
        </div>
      </div>

      {/* MỨC GIÁ TỐI ĐA */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Mức giá tối đa
          </h4>
          <span className="text-xs font-extrabold text-[#E06D53]">
            {formatVND(inputCategory.priceFilter.value)}
          </span>
        </div>
        <input
          type="range"
          min={30000}
          max={500000}
          step={10000}
          value={inputCategory.priceFilter.value}
          onChange={(e) =>
            setInputCategory({
              ...inputCategory,
              priceFilter: {
                text: "price",
                value: Number(e.target.value),
              },
            })
          }
          className="range range-xs accent-[#E06D53] w-full"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>30.000 ₫</span>
          <span>500.000 ₫</span>
        </div>
      </div>
    </div>
  );
};

export default Filters;