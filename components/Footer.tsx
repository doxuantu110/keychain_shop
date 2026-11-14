"use client";

import Link from "next/link";
import React from "react";
import { navigation } from "@/lib/utils";
import { FaCube, FaShieldHeart, FaTruckFast, FaArrowRight, FaRotateLeft } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="bg-[#1E2229] text-white border-t border-[#2D323C] mt-20" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Chân trang Craft3D
      </h2>

      {/* Cam kết nổi bật */}
      <div className="border-b border-[#2D323C] bg-[#181B20]">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2D323C] flex items-center justify-center text-[#E06D53] text-xl flex-shrink-0">
              <FaTruckFast />
            </div>
            <div>
              <h4 className="font-semibold text-white">Miễn Phí Vận Chuyển</h4>
              <p className="text-gray-400 text-xs mt-0.5">Tự động áp dụng cho đơn hàng từ 300.000 ₫</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2D323C] flex items-center justify-center text-[#E06D53] text-xl flex-shrink-0">
              <FaShieldHeart />
            </div>
            <div>
              <h4 className="font-semibold text-white">Thanh Toán Khi Nhận Hàng</h4>
              <p className="text-gray-400 text-xs mt-0.5">Kiểm tra đúng mẫu, đúng tên khắc trước khi trả tiền</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2D323C] flex items-center justify-center text-[#E06D53] text-xl flex-shrink-0">
              <FaRotateLeft />
            </div>
            <div>
              <h4 className="font-semibold text-white">Đổi Trả Trong 7 Ngày</h4>
              <p className="text-gray-400 text-xs mt-0.5">Bảo hành 1 đổi 1 nếu sai sót hoặc lỗi chế tác</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chính footer */}
      <div id="contact" className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Cột thương hiệu */}
          <div className="lg:col-span-2 flex flex-col gap-y-4">
            <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white group">
              <span className="w-10 h-10 rounded-xl bg-[#E06D53] flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
                <FaCube />
              </span>
              <span>Craft<span className="text-[#E06D53]">3D</span></span>
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed max-w-sm mt-1">
              Xưởng chế tác & in 3D cá nhân hóa. Biến tên riêng, thông điệp hoặc ý tưởng của bạn thành những món phụ kiện độc bản với công nghệ in 3D độ nét cao.
            </p>
            <div className="flex flex-col gap-1 text-xs text-gray-400 mt-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Xưởng in 3D hoạt động liên tục – Giao hàng toàn quốc</span>
              </div>
              <p className="text-gray-300 font-medium mt-1">Hotline / Zalo: 0988.123.456</p>
              <p className="text-gray-400">Email: hotro@craft3d.vn</p>
            </div>
          </div>

          {/* Cột 1: Sản phẩm */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E06D53] mb-4">
              Sản Phẩm
            </h3>
            <ul className="space-y-2.5 text-sm">
              {navigation.products.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 2: Chính sách */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E06D53] mb-4">
              Chính Sách
            </h3>
            <ul className="space-y-2.5 text-sm">
              {navigation.policy.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ & Tra cứu */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#E06D53] mb-4">
              Hỗ Trợ Khách Hàng
            </h3>
            <ul className="space-y-2.5 text-sm">
              {navigation.help.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Link
                href="/order-lookup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D323C] hover:bg-[#3D4452] text-white text-xs font-medium transition-colors"
              >
                Tra cứu đơn nhanh <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Thanh bản quyền */}
        <div className="mt-14 pt-8 border-t border-[#2D323C] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Craft3D – Móc Khóa & Quà Tặng In 3D Cá Nhân Hóa. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4">
            <span>Thiết kế tối ưu theo đơn đặt hàng</span>
            <span>•</span>
            <span>Hỗ trợ xem trước 3D / AR</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;