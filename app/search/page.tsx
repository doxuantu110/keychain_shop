import { ProductItem, SectionTitle } from "@/components";
import apiClient from "@/lib/api";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { FaMagnifyingGlass, FaCube } from "react-icons/fa6";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

const SearchPage = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  const searchQuery = sp?.search ? sanitize(sp.search).trim() : "";
  let products = [];

  try {
    const data = await apiClient.get(
      `/api/search?query=${encodeURIComponent(searchQuery)}`
    );

    if (!data.ok) {
      console.error("Failed to fetch search results:", data.statusText);
      products = [];
    } else {
      const result = await data.json();
      products = Array.isArray(result) ? result : [];
    }
  } catch (error) {
    console.error("Error fetching search results:", error);
    products = [];
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen pb-16">
      <SectionTitle
        title="Tìm Kiếm Sản Phẩm"
        path={`Trang chủ / Tìm kiếm ${searchQuery ? `"${searchQuery}"` : ""}`}
      />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {searchQuery && (
          <div className="mb-8 pb-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-[#1E2229]">
              Kết quả tìm kiếm cho: <span className="text-[#E06D53]">&ldquo;{searchQuery}&rdquo;</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Tìm thấy {products.length} sản phẩm
            </span>
          </div>
        )}

        {products.length > 0 ? (
          <div>
            {products.length === 1 && (
              <div className="max-w-2xl mx-auto">
                <ProductItem product={products[0]} isLarge={true} />
              </div>
            )}
            {products.length === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {products.map((product: any) => (
                  <ProductItem key={product.id} product={product} isLarge={true} />
                ))}
              </div>
            )}
            {products.length >= 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {products.map((product: any) => (
                  <ProductItem key={product.id} product={product} isLarge={false} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E5E4] max-w-xl mx-auto p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-2xl mx-auto mb-4">
              <FaMagnifyingGlass />
            </div>
            <h3 className="text-lg font-bold text-[#1E2229]">
              Không tìm thấy sản phẩm nào
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
              Rất tiếc, chúng tôi không tìm thấy kết quả phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Hãy thử tìm với tên ngắn gọn hơn hoặc xem danh mục sản phẩm nổi bật nhé!
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#2D323C] transition-colors"
              >
                <FaCube className="text-[#E06D53]" />
                <span>Xem tất cả sản phẩm</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;