"use client";

import React from "react";
import { useSortStore } from "@/app/_zustand/sortStore";

const SortBy = () => {
  const { sortBy, changeSortBy } = useSortStore();

  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <label htmlFor="sort-select" className="text-gray-500 font-medium whitespace-nowrap">
        Sắp xếp theo:
      </label>
      <select
        id="sort-select"
        value={sortBy}
        onChange={(e) => changeSortBy(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs sm:text-sm text-[#1E2229] font-medium outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all cursor-pointer shadow-sm"
        name="sort"
      >
        <option value="defaultSort">Mặc định</option>
        <option value="lowPrice">Giá thấp đến cao</option>
        <option value="highPrice">Giá cao đến thấp</option>
        <option value="titleAsc">Tên sản phẩm A-Z</option>
        <option value="titleDesc">Tên sản phẩm Z-A</option>
      </select>
    </div>
  );
};

export default SortBy;