"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationType } from "@/types/notification";
import NotificationCard from "@/components/NotificationCard";
import { useNotificationStore } from "@/app/_zustand/notificationStore";
import { 
  FaSearch, 
  FaFilter, 
  FaCheckCircle, 
  FaTrash, 
  FaSpinner,
  FaBell 
} from "react-icons/fa";

const NotificationsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    notifications,
    total,
    page,
    totalPages,
    loading,
    error,
    selectedIds,
    filters,
    fetchNotifications,
    markSelectedAsRead,
    deleteSelectedNotifications,
    updateFilters,
    loadMore,
    markNotificationAsRead,
    deleteNotificationById
  } = useNotifications();

  const { toggleSelection, selectAll, clearSelection } = useNotificationStore();

  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [selectedType, setSelectedType] = useState<string>(filters.type || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(
    filters.isRead === undefined ? "all" : filters.isRead ? "read" : "unread"
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    setSearchTerm(filters.search || "");
    setSelectedType(filters.type || "all");
    setSelectedStatus(
      filters.isRead === undefined ? "all" : filters.isRead ? "read" : "unread"
    );
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ 
      search: searchTerm.trim() || undefined,
      page: 1 
    });
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    updateFilters({ 
      type: type === "all" ? undefined : type as NotificationType,
      page: 1 
    });
  };

  const handleStatusFilter = (statusVal: string) => {
    setSelectedStatus(statusVal);
    const isRead = statusVal === "all" ? undefined : statusVal === "read";
    updateFilters({ 
      isRead,
      page: 1 
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      selectAll();
    } else {
      clearSelection();
    }
  };

  const handleBulkMarkAsRead = async () => {
    await markSelectedAsRead();
  };

  const handleBulkDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa các thông báo đã chọn?")) {
      await deleteSelectedNotifications();
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <FaSpinner className="animate-spin text-3xl text-[#E06D53]" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-lg">
              <FaBell />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229]">Trung Tâm Thông Báo</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Theo dõi tiến độ đơn hàng và các cập nhật mới nhất từ xưởng Craft3D
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E7E5E4] p-6 mb-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-[#1E2229] hover:bg-[#E06D53] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Tìm kiếm
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500">
              <FaFilter className="text-[10px]" />
              <span>Bộ lọc:</span>
            </div>

            <select
              value={selectedType}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#E06D53]"
            >
              <option value="all">Tất cả loại thông báo</option>
              <option value={NotificationType.ORDER_UPDATE}>Cập nhật đơn hàng</option>
              <option value={NotificationType.PAYMENT_STATUS}>Thanh toán & COD</option>
              <option value={NotificationType.PROMOTION}>Ưu đãi & Khuyến mãi</option>
              <option value={NotificationType.SYSTEM_ALERT}>Thông báo hệ thống</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#E06D53]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedType("all");
                setSelectedStatus("all");
                updateFilters({ 
                  type: undefined, 
                  isRead: undefined, 
                  search: undefined, 
                  page: 1,
                  limit: 10,
                  sortBy: "createdAt",
                  sortOrder: "desc"
                });
              }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-[#E06D53] transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-[#FDF2EE] border border-[#E06D53]/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <span className="text-xs font-medium text-[#E06D53]">
              Đã chọn {selectedIds.length} thông báo
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkMarkAsRead}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1E2229] bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <FaCheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Đánh dấu đã đọc
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50"
              >
                <FaTrash className="w-3 h-3 mr-1" />
                Xóa
              </button>
            </div>
          </div>
        )}

        {/* Select All Checkbox */}
        {notifications.length > 0 && (
          <div className="mb-4 px-1">
            <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === notifications.length && notifications.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-[#1E2229] bg-gray-100 border-gray-300 rounded focus:ring-[#E06D53]"
              />
              <span>Chọn tất cả thông báo</span>
            </label>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4]">
              <FaSpinner className="animate-spin text-2xl text-gray-400 mx-auto mb-3" />
              <p className="text-xs text-gray-500">Đang tải thông báo...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E7E5E4] p-6">
              <p className="text-sm text-rose-600 font-semibold mb-2">Lỗi tải thông báo</p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => fetchNotifications()}
                className="px-4 py-2 bg-[#1E2229] text-white rounded-xl text-xs font-semibold hover:bg-[#2D323C]"
              >
                Thử lại
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E5E4] p-8">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF9F6] text-gray-300 flex items-center justify-center text-2xl mx-auto mb-4">
                <FaBell />
              </div>
              <h3 className="text-base font-bold text-[#1E2229] mb-1">Không có thông báo nào</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Hiện tại bạn chưa có thông báo mới nào từ xưởng Craft3D.
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  isSelected={selectedIds.includes(notification.id)}
                  onToggleSelect={toggleSelection}
                  onMarkAsRead={markNotificationAsRead}
                  onDelete={async (id) => {
                    if (confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
                      await deleteNotificationById(id);
                    }
                  }}
                />
              ))}

              {page < totalPages && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#1E2229] text-white text-xs font-semibold rounded-xl hover:bg-[#2D323C] disabled:opacity-50"
                  >
                    {loading ? "Đang tải thêm..." : "Tải thêm thông báo"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;