import {
  Breadcrumb,
  ProductGallery,
  ProductTabs,
  SingleProductDynamicFields,
} from "@/components";
import { productService } from "@/services/apiService";
import { notFound } from "next/navigation";
import React from "react";
import { FaSquareFacebook, FaSquareXTwitter, FaSquarePinterest, FaShieldHalved, FaTruckFast } from "react-icons/fa6";
import { sanitize } from "@/lib/sanitize";
import { Product } from "@/types/product";

interface SingleProductPageProps {
  params: Promise<{ productSlug: string; id?: string }>;
}

const SingleProductPage = async ({ params }: SingleProductPageProps) => {
  const { productSlug } = await params;

  let product: Product | null = null;
  try {
    product = await productService.getBySlug(productSlug);
  } catch (err) {
    notFound();
  }

  if (!product || !product.id) {
    notFound();
  }

  const images = product.images || [];

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-8">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <Breadcrumb currentPage={product.title} />

        <div className="mt-4 bg-white rounded-3xl border border-[#E7E5E4] p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* CỘT TRÁI: GALLERY 3 ẢNH & AR/3D */}
            <div className="lg:col-span-6 flex flex-col items-center w-full">
              <ProductGallery
                mainImage={product.mainImage}
                images={images}
                title={sanitize(product.title)}
                arEnabled={product.arEnabled}
              />

              {/* Cam kết nhanh bên dưới ảnh */}
              <div className="mt-6 w-full grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF9F6] border border-gray-100">
                  <FaTruckFast className="text-[#E06D53] text-sm flex-shrink-0" />
                  <span>Freeship đơn từ 300K</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF9F6] border border-gray-100">
                  <FaShieldHalved className="text-[#E06D53] text-sm flex-shrink-0" />
                  <span>Đổi trả 7 ngày</span>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: THÔNG TIN CHI TIẾT & BỘ CHỌN BIẾN THỂ / TÙY BIẾN */}
            <div className="lg:col-span-6 flex flex-col gap-y-4">
              {product.category?.name && (
                <span className="inline-block w-fit text-[11px] font-bold text-[#E06D53] bg-[#FDF2EE] border border-[#E06D53]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  {product.category.name}
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] leading-tight tracking-tight">
                {sanitize(product.title)}
              </h1>

              {/* Component tương tác chính: Chọn Size, Khắc tên, Preview, Số lượng, Thêm giỏ / Mua ngay */}
              <SingleProductDynamicFields product={product} />

              {/* Thông tin bổ sung */}
              <div className="mt-4 pt-5 border-t border-gray-100 flex flex-col gap-y-3 text-xs text-gray-500">
                <div className="flex items-center gap-x-3">
                  <span className="font-medium text-gray-700">Chia sẻ sản phẩm:</span>
                  <div className="flex items-center gap-x-2 text-xl text-gray-400">
                    <FaSquareFacebook className="hover:text-blue-600 transition-colors cursor-pointer" />
                    <FaSquareXTwitter className="hover:text-black transition-colors cursor-pointer" />
                    <FaSquarePinterest className="hover:text-rose-600 transition-colors cursor-pointer" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Lưu ý: Do sản phẩm in 3D và khắc tên theo đơn đặt hàng, thời gian chuẩn bị hàng từ 1 - 2 ngày làm việc trước khi giao cho đơn vị vận chuyển.
                </p>
              </div>
            </div>
          </div>

          {/* Tab mô tả chi tiết sản phẩm */}
          <div className="mt-14 pt-10 border-t border-gray-100">
            <ProductTabs product={product} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;