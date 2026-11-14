"use client";

import { usePathname } from "next/navigation";
import React, { useState } from "react";
import HeaderTop from "./HeaderTop";
import SearchInput from "./SearchInput";
import Link from "next/link";
import CartElement from "./CartElement";
import NotificationBell from "./NotificationBell";
import HeartElement from "./HeartElement";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import { FaCube, FaBars, FaXmark, FaRegUser } from "react-icons/fa6";

const Header = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { wishQuantity } = useWishlistStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
    toast.success("Đã đăng xuất thành công!");
  };

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Sản phẩm", href: "/shop" },
    { label: "Về chúng tôi", href: "/#about" },
    { label: "Liên hệ", href: "/#contact" },
  ];

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-[#E7E5E4] shadow-sm">
      <HeaderTop />

      {/* HEADER CHO KHÁCH HÀNG */}
      {!pathname.startsWith("/admin") && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Logo Thương Hiệu */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <span className="w-10 h-10 rounded-xl bg-[#1E2229] flex items-center justify-center text-[#E06D53] text-xl shadow-sm group-hover:bg-[#E06D53] group-hover:text-white transition-all">
                  <FaCube />
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-[#1E2229]">
                  Craft<span className="text-[#E06D53]">3D</span>
                </span>
              </Link>

              {/* Navigation Desktop */}
              <nav className="hidden lg:flex items-center gap-x-6 text-sm font-semibold text-[#18181B]">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`transition-colors hover:text-[#E06D53] ${
                        isActive ? "text-[#E06D53] font-bold" : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Thanh Tìm Kiếm Desktop */}
            <div className="hidden md:flex flex-1 max-w-sm mx-4">
              <SearchInput />
            </div>

            {/* Các nút hành động bên phải: Tài khoản, Giỏ hàng */}
            <div className="flex items-center gap-x-2 sm:gap-x-3">
              {/* Tài khoản */}
              {!session ? (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#E06D53] hover:bg-[#F5F3EF] transition-colors"
                >
                  <FaRegUser className="text-xs" />
                  <span>Tài khoản</span>
                </Link>
              ) : (
                <div className="dropdown dropdown-end hidden sm:inline-block">
                  <div
                    tabIndex={0}
                    role="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#E06D53] hover:bg-[#F5F3EF] transition-colors cursor-pointer"
                  >
                    <FaRegUser className="text-xs" />
                    <span className="max-w-[90px] truncate">{session.user?.name || "Tài khoản"}</span>
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[50] menu p-2 shadow-lg bg-white border border-gray-100 rounded-xl w-48 text-xs mt-2"
                  >
                    {(session.user as any)?.role === "admin" && (
                      <li>
                        <Link href="/admin">Quản trị hệ thống</Link>
                      </li>
                    )}
                    <li>
                      <Link href="/order-lookup">Tra cứu đơn hàng</Link>
                    </li>
                    <li className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="text-rose-600">Đăng xuất</button>
                    </li>
                  </ul>
                </div>
              )}

              <HeartElement wishQuantity={wishQuantity} />
              <CartElement />

              {/* Hamburger Button Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <FaXmark className="text-xl" /> : <FaBars className="text-xl" />}
              </button>
            </div>
          </div>

          {/* Thanh tìm kiếm trên mobile */}
          <div className="md:hidden pb-3 pt-1">
            <SearchInput />
          </div>

          {/* Drawer Menu Mobile */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4 px-2 space-y-1 bg-white">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-[#F5F3EF] hover:text-[#E06D53] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-[#F5F3EF] hover:text-[#E06D53] transition-colors"
                >
                  Tài khoản của bạn
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-[#F5F3EF] hover:text-[#E06D53] transition-colors"
                >
                  Giỏ hàng
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HEADER CHO TRANG QUẢN TRỊ ADMIN */}
      {pathname.startsWith("/admin") && (
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-16 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-lg bg-[#1E2229] flex items-center justify-center text-[#E06D53] text-sm">
                <FaCube />
              </span>
              <span className="text-xl font-bold tracking-tight text-[#1E2229]">
                Craft<span className="text-[#E06D53]">3D</span>
              </span>
            </Link>
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 border border-gray-200">
              Quản Trị Hệ Thống
            </span>
          </div>

          <div className="flex items-center gap-x-4">
            <Link
              href="/"
              className="text-xs font-medium text-gray-600 hover:text-[#E06D53] transition-colors"
            >
              ← Về Cửa Hàng
            </Link>
            <NotificationBell />
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                <div className="bg-[#1E2229] text-white rounded-full w-9">
                  <span className="text-xs font-bold">AD</span>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-[50] menu p-2 shadow-lg bg-white border border-gray-100 rounded-xl w-52 text-sm mt-2"
              >
                <li>
                  <Link href="/admin">Bảng Điều Khiển</Link>
                </li>
                <li>
                  <Link href="/admin/products">Quản Lý Sản Phẩm</Link>
                </li>
                <li>
                  <Link href="/admin/orders">Quản Lý Đơn Hàng</Link>
                </li>
                <li className="border-t border-gray-100 mt-1 pt-1">
                  <button onClick={handleLogout} className="text-rose-600">Đăng xuất</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;