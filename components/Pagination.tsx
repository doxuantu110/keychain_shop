"use client";

import { usePaginationStore } from "@/app/_zustand/paginationStore";
import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const Pagination = () => {
  const { page, incrementPage, decrementPage } = usePaginationStore();

  return (
    <div className="flex justify-center items-center gap-2 py-12">
      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-[#1E2229] hover:bg-gray-50 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm"
        onClick={() => decrementPage()}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <FaChevronLeft className="text-xs" />
      </button>

      <span className="px-5 py-2 rounded-xl bg-[#1E2229] text-white text-xs sm:text-sm font-semibold shadow-sm">
        Trang {page}
      </span>

      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-[#1E2229] hover:bg-gray-50 transition-all shadow-sm"
        onClick={() => incrementPage()}
        aria-label="Trang sau"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

export default Pagination;