"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FaBell } from "react-icons/fa6";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useSession } from "next-auth/react";

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const { unreadCount } = useUnreadCount();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative p-2 text-gray-700 hover:text-[#E06D53] hover:bg-gray-100/60 rounded-full transition-colors focus:outline-none"
        aria-label={`Thông báo ${unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ""}`}
      >
        <FaBell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#E06D53] rounded-full animate-pulse shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E7E5E4] rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#1E2229]">Thông báo của bạn</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-medium bg-[#FDF2EE] text-[#E06D53] px-2 py-0.5 rounded-full">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-b border-gray-100 bg-[#FAF9F6] flex gap-2">
            <Link
              href="/notifications"
              onClick={() => setIsDropdownOpen(false)}
              className="flex-1 py-1.5 px-3 text-xs font-semibold text-center text-[#1E2229] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
            >
              Xem tất cả
            </Link>
          </div>

          {/* Notification Preview */}
          <div className="max-h-64 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="p-6 text-center">
                <FaBell className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-600 text-xs font-medium">Không có thông báo mới</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Bạn đã xem hết các thông báo gần đây.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-2">
                    Bạn có {unreadCount} thông báo đơn hàng & chế tác mới
                  </p>
                  <Link
                    href="/notifications"
                    onClick={() => setIsDropdownOpen(false)}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold text-[#E06D53] bg-[#FDF2EE] border border-[#E06D53]/20 rounded-full hover:bg-[#FCE7E0] transition-colors"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#FAF9F6] border-t border-gray-100 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsDropdownOpen(false)}
              className="text-xs font-semibold text-gray-600 hover:text-[#E06D53] transition-colors"
            >
              Đến Trung Tâm Thông Báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;