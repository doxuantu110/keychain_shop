export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Breadcrumb, Products } from "@/components";
import React from "react";
import { FaTruckFast, FaShieldHeart, FaRotateLeft, FaWandMagicSparkles } from "react-icons/fa6";

const ShopPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb đơn giản */}
        <Breadcrumb currentPage="Sản phẩm" />

        {/* Tiêu đề & Giới thiệu bộ sưu tập */}
        <div className="mt-6 mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF2EE] border border-[#E06D53]/20 text-[#E06D53] text-xs font-semibold mb-3">
            <FaWandMagicSparkles className="text-xs" />
            <span>Bộ Sưu Tập Tuyển Chọn</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E2229] tracking-tight">
            Sản Phẩm Thủ Công In 3D
          </h1>

          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Mỗi tác phẩm tại Craft3D đều được thiết kế độc bản, in 3D tỉ mỉ với độ phân giải cao và hoàn thiện thủ công theo yêu cầu riêng của bạn.
          </p>
        </div>

        {/* Lưới sản phẩm dạng Boutique Grid (Lớn, đẹp, thoáng) */}
        <main className="w-full">
          <Products params={awaitedParams} searchParams={awaitedSearchParams} />
        </main>

        {/* Thanh cam kết dịch vụ chân trang Cửa hàng */}
        <div className="mt-16 pt-10 border-t border-gray-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] shadow-sm flex flex-col items-center">
            <span className="w-10 h-10 rounded-xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-lg mb-3">
              <FaTruckFast />
            </span>
            <h4 className="text-sm font-bold text-[#1E2229]">Freeship Đơn Từ 300.000 ₫</h4>
            <p className="text-xs text-gray-500 mt-1">Giao hàng tận nơi toàn quốc nhanh chóng</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] shadow-sm flex flex-col items-center">
            <span className="w-10 h-10 rounded-xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-lg mb-3">
              <FaShieldHeart />
            </span>
            <h4 className="text-sm font-bold text-[#1E2229]">Kiểm Tra Trước Khi Trả Tiền (COD)</h4>
            <p className="text-xs text-gray-500 mt-1">Kiểm tra đúng tên khắc, đúng màu sắc yêu thích</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] shadow-sm flex flex-col items-center">
            <span className="w-10 h-10 rounded-xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-lg mb-3">
              <FaRotateLeft />
            </span>
            <h4 className="text-sm font-bold text-[#1E2229]">Bảo Hành Đổi Mới Trong 7 Ngày</h4>
            <p className="text-xs text-gray-500 mt-1">1 đổi 1 nhanh chóng nếu có lỗi chế tác</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
