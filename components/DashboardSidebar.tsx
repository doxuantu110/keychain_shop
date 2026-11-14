"use client";

import React from "react";
import { MdDashboard } from "react-icons/md";
import { FaTable, FaRegUser, FaBagShopping, FaStore } from "react-icons/fa6";
import { MdCategory } from "react-icons/md";
import { FaFileUpload } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DashboardSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { label: "Bảng Điều Khiển", href: "/admin", icon: <MdDashboard className="text-xl" /> },
    { label: "Quản Lý Đơn Hàng", href: "/admin/orders", icon: <FaBagShopping className="text-xl" /> },
    { label: "Quản Lý Sản Phẩm", href: "/admin/products", icon: <FaTable className="text-xl" /> },
    { label: "Nhập Hàng Loạt", href: "/admin/bulk-upload", icon: <FaFileUpload className="text-xl" /> },
    { label: "Danh Mục Sản Phẩm", href: "/admin/categories", icon: <MdCategory className="text-xl" /> },
    { label: "Người Dùng", href: "/admin/users", icon: <FaRegUser className="text-xl" /> },
    { label: "Xưởng / Merchant", href: "/admin/merchant", icon: <FaStore className="text-xl" /> },
  ];

  return (
    <aside className="w-full xl:w-72 bg-[#1E2229] text-white flex-shrink-0 min-h-screen border-r border-[#2D323C] p-4 flex flex-col gap-y-1">
      <div className="px-3 py-4 border-b border-[#2D323C] mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#E06D53]">
          Trung Tâm Quản Trị
        </span>
        <h2 className="text-lg font-bold text-white mt-0.5">Craft3D Admin</h2>
      </div>

      <nav className="flex flex-col gap-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                    ? "bg-[#E06D53] text-white font-bold shadow-sm"
                    : "text-gray-300 hover:bg-[#2D323C] hover:text-white"
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;