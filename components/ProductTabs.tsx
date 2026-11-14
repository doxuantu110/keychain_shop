"use client";

import React, { useState } from "react";
import { formatCategoryName } from "@/utils/categoryFormating";
import { sanitize, sanitizeHtml } from "@/lib/sanitize";
import { Product } from "@/types/product";

const ProductTabs = ({ product }: { product: Product }) => {
  const [currentProductTab, setCurrentProductTab] = useState<number>(0);

  return (
    <div className="text-[#1E2229]">
      <div className="flex border-b border-gray-200 gap-8">
        <button
          type="button"
          className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
            currentProductTab === 0
              ? "text-[#E06D53] border-b-2 border-[#E06D53]"
              : "text-gray-500 hover:text-gray-800"
          }`}
          onClick={() => setCurrentProductTab(0)}
        >
          Mô tả chi tiết
        </button>
        <button
          type="button"
          className={`pb-3 text-sm sm:text-base font-bold transition-all relative ${
            currentProductTab === 1
              ? "text-[#E06D53] border-b-2 border-[#E06D53]"
              : "text-gray-500 hover:text-gray-800"
          }`}
          onClick={() => setCurrentProductTab(1)}
        >
          Thông số kỹ thuật & Chế tác
        </button>
      </div>

      <div className="pt-6">
        {currentProductTab === 0 && (
          <div
            className="prose max-w-none text-sm sm:text-base text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(product?.description),
            }}
          />
        )}

        {currentProductTab === 1 && (
          <div className="overflow-x-auto max-w-xl">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-500 w-1/3">Công nghệ chế tác:</th>
                  <td className="py-3 text-[#1E2229] font-medium">In 3D FDM & Hoàn thiện thủ công</td>
                </tr>
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-500">Xưởng sản xuất:</th>
                  <td className="py-3 text-[#1E2229] font-medium">{sanitize(product?.manufacturer) || "Craft3D Studio"}</td>
                </tr>
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-500">Danh mục:</th>
                  <td className="py-3 text-[#1E2229] font-medium">
                    {product?.category?.name
                      ? sanitize(formatCategoryName(product?.category?.name))
                      : "Móc khóa & Phụ kiện"}
                  </td>
                </tr>
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-500">Cá nhân hóa khắc tên:</th>
                  <td className="py-3 text-[#1E2229] font-medium">
                    {product?.isCustomizable ? `Hỗ trợ tối đa ${product.maxCustomTextLength || 30} ký tự` : "Mẫu cố định"}
                  </td>
                </tr>
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-500">Hỗ trợ tương tác 3D:</th>
                  <td className="py-3 text-[#1E2229] font-medium">
                    {product?.arEnabled ? "Có (Hỗ trợ WebXR & Quick Look trên iOS/Android)" : "Chưa tích hợp"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTabs;