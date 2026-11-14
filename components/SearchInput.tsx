"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { sanitize } from "@/lib/sanitize";
import { FaMagnifyingGlass } from "react-icons/fa6";

const SearchInput = () => {
  const [searchInput, setSearchInput] = useState<string>("");
  const router = useRouter();

  const searchProducts = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sanitizedSearch = sanitize(searchInput).trim();
    if (sanitizedSearch) {
      router.push(`/search?search=${encodeURIComponent(sanitizedSearch)}`);
      setSearchInput("");
    }
  };

  return (
    <form className="relative flex w-full max-w-md items-center" onSubmit={searchProducts}>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Tìm kiếm móc khóa, bảng tên in 3D..."
        className="w-full rounded-full border border-gray-200 bg-[#F5F3EF] py-2.5 pl-4 pr-11 text-sm text-[#18181B] placeholder-gray-400 outline-none transition-all focus:border-[#E06D53] focus:bg-white focus:ring-2 focus:ring-[#E06D53]/20"
      />
      <button
        type="submit"
        className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#1E2229] text-white hover:bg-[#E06D53] transition-colors shadow-sm"
        aria-label="Tìm kiếm"
      >
        <FaMagnifyingGlass className="text-xs" />
      </button>
    </form>
  );
};

export default SearchInput;