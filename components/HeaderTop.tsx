"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import toast from "react-hot-toast";
import { FaRegUser, FaMagnifyingGlass, FaTruckFast, FaArrowRightFromBracket } from "react-icons/fa6";

const HeaderTop = () => {
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
    toast.success("Đã đăng xuất thành công!");
  };

  return (
    <div className="h-10 text-xs text-gray-300 bg-[#181B20] border-b border-[#2D323C]">
      <div className="flex justify-between items-center h-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        {/* Banner thông báo */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[#E06D53] font-medium">
            <FaTruckFast />
            <span>Ưu đãi:</span>
          </span>
          <span className="hidden sm:inline text-gray-300">
            Miễn phí vận chuyển đơn từ 300.000 ₫ • Kiểm tra hàng trước khi thanh toán (COD)
          </span>
          <span className="sm:hidden text-gray-300 truncate max-w-[200px]">
            Freeship đơn từ 300k
          </span>
        </div>

        {/* Liên kết tiện ích */}
        <ul className="flex items-center gap-x-4 sm:gap-x-6 h-full font-medium">
          <li>
            <Link
              href="/order-lookup"
              className="flex items-center gap-x-1.5 text-gray-300 hover:text-white transition-colors"
            >
              <FaMagnifyingGlass className="text-[11px] text-[#E06D53]" />
              <span>Tra cứu đơn hàng</span>
            </Link>
          </li>

          {!session ? (
            <>
              <li>
                <Link
                  href="/login"
                  className="flex items-center gap-x-1.5 text-gray-300 hover:text-white transition-colors"
                >
                  <FaRegUser className="text-[11px]" />
                  <span>Đăng nhập</span>
                </Link>
              </li>
              <li className="hidden sm:block">
                <Link
                  href="/register"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Đăng ký
                </Link>
              </li>
            </>
          ) : (
            <li className="flex items-center gap-x-3">
              <span className="hidden sm:inline text-gray-300 max-w-[150px] truncate">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-x-1 text-gray-400 hover:text-rose-400 transition-colors"
                title="Đăng xuất"
              >
                <FaArrowRightFromBracket className="text-[11px]" />
                <span>Đăng xuất</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default HeaderTop;