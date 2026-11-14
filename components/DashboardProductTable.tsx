"use client";

import { nanoid } from "nanoid";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import apiClient from "@/lib/api";
import { sanitize } from "@/lib/sanitize";
import { formatVND } from "@/types/cart";
import { Product } from "@/types/product";
import { FaPlus, FaCube } from "react-icons/fa6";

const DashboardProductTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/products?mode=admin", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full bg-white rounded-3xl border border-[#E7E5E4] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-[#1E2229]">Danh Sách Sản Phẩm In 3D</h2>
          <p className="text-xs text-gray-500 mt-0.5">Quản lý catalog sản phẩm, biến thể và chế tác</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2229] hover:bg-[#E06D53] text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <FaPlus className="text-[10px]" />
          <span>Thêm sản phẩm mới</span>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-md w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th>Sản phẩm</th>
              <th>Xưởng chế tác</th>
              <th>Tình trạng kho</th>
              <th>Giá từ (VND)</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id || nanoid()} className="hover:bg-gray-50/60 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-gray-200 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                        <Image
                          width={48}
                          height={48}
                          src={product?.mainImage ? `/${product?.mainImage}` : "/product_placeholder.jpg"}
                          alt={sanitize(product?.title) || "Móc khóa in 3D"}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-[#1E2229] line-clamp-1">{sanitize(product?.title)}</div>
                        <div className="text-xs text-gray-400">
                          {product?.category?.name || "Chưa phân loại"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-gray-600 font-medium">
                    {sanitize(product?.manufacturer) || "Craft3D"}
                  </td>
                  <td>
                    {product?.inStock ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        Còn hàng / Đặt trước
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                        Hết hàng
                      </span>
                    )}
                  </td>
                  <td className="font-bold text-[#1E2229]">
                    {formatVND(product?.price)}
                  </td>
                  <td>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-[#1E2229] hover:text-white hover:border-[#1E2229] text-xs font-semibold transition-all shadow-xs"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-xs text-gray-400">
                  {loading ? "Đang tải danh sách sản phẩm..." : "Chưa có sản phẩm nào trong hệ thống."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardProductTable;