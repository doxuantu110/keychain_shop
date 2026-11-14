import React from "react";
import ProductItem from "./ProductItem";
import apiClient from "@/lib/api";
import { FaCube } from "react-icons/fa6";

const Products = async ({
  params,
  searchParams,
}: {
  params: { slug?: string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  let products = [];

  try {
    const data = await apiClient.get("/api/products");

    if (!data.ok) {
      console.error("Failed to fetch products:", data.statusText);
      products = [];
    } else {
      const result = await data.json();
      products = Array.isArray(result) ? result : [];
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    products = [];
  }

  // Lọc sản phẩm đang hoạt động (isActive)
  const activeProducts = products.filter((p: any) => p.isActive !== false);

  return (
    <div className="w-full">
      {activeProducts.length > 0 ? (
        <div>
          {/* 1 sản phẩm: Showcase Card lớn trung tâm */}
          {activeProducts.length === 1 && (
            <div className="max-w-2xl mx-auto">
              <ProductItem product={activeProducts[0]} isLarge={true} />
            </div>
          )}

          {/* 2 sản phẩm: Grid 2 cột lớn, khoảng cách thoáng đãng */}
          {activeProducts.length === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
              {activeProducts.map((product: any) => (
                <ProductItem key={product.id} product={product} isLarge={true} />
              ))}
            </div>
          )}

          {/* 3 sản phẩm trở lên: Grid 3 cột */}
          {activeProducts.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {activeProducts.map((product: any) => (
                <ProductItem key={product.id} product={product} isLarge={false} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF9F6] shadow-sm flex items-center justify-center text-2xl text-[#E06D53] mx-auto mb-4 border border-gray-100">
            <FaCube />
          </div>
          <h3 className="text-lg font-bold text-[#1E2229]">
            Hiện chưa có sản phẩm nào khả dụng
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Các sản phẩm in 3D mới đang được xưởng chuẩn bị và cập nhật. Vui lòng quay lại sau!
          </p>
        </div>
      )}
    </div>
  );
};

export default Products;
