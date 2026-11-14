"use client";

import { DashboardSidebar, StatsElement } from "@/components";
import React from "react";
import Link from "next/link";
import { FaBagShopping, FaTable, FaRegUser, FaCube, FaArrowRight } from "react-icons/fa6";

const AdminDashboardPage = () => {
  return (
    <div className="bg-[#FAF9F6] min-h-screen flex flex-col xl:flex-row">
      <DashboardSidebar />

      <main className="flex-1 p-6 sm:p-10 flex flex-col gap-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53]">
            Tổng Quan Hệ Thống
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] mt-1">
            Bảng Điều Khiển Quản Trị Craft3D
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi tình trạng kho hàng móc khóa in 3D, tiến độ đơn hàng và dữ liệu khách hàng.
          </p>
        </div>

        {/* Thẻ thống kê */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsElement
            title="Đơn Hàng Mới"
            value="42"
            change="Tăng 18% hôm nay"
            icon={<FaBagShopping className="text-xl text-[#E06D53]" />}
          />
          <StatsElement
            title="Sản Phẩm Đang Bán"
            value="24"
            change="Hoạt động 100%"
            icon={<FaTable className="text-xl text-emerald-600" />}
          />
          <StatsElement
            title="Biến Thể Đã Kiểm Kho"
            value="76"
            change="Đồng bộ Single Source"
            icon={<FaCube className="text-xl text-indigo-600" />}
          />
          <StatsElement
            title="Khách Hàng Đăng Ký"
            value="318"
            change="Tăng 8.5% tuần này"
            icon={<FaRegUser className="text-xl text-amber-600" />}
          />
        </div>

        {/* Khối quản lý tác vụ nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1E2229] mb-2">
                Quản Lý Đơn Hàng & Khắc Tên
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Xem danh sách đơn đặt hàng COD, kiểm tra nội dung chữ khắc laser và cập nhật trạng thái đơn (Đang sản xuất, Đang giao, Hoàn tất).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">Trạng thái: Hoạt động</span>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#E06D53] transition-colors"
              >
                <span>Xem đơn hàng</span>
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1E2229] mb-2">
                Quản Lý Sản Phẩm & Biến Thể
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tạo mới mẫu móc khóa, tải lên mô hình 3D (GLB/USDZ), cấu hình biến thể kích thước (6cm, 8cm, 10cm) và quản lý số lượng tồn kho thực tế.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">Nguồn dữ liệu: ProductVariant</span>
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#E06D53] transition-colors"
              >
                <span>Xem sản phẩm</span>
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;