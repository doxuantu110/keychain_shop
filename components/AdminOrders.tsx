"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";
import { formatVND } from "@/types/cart";
import {
  FaMagnifyingGlass,
  FaFilter,
  FaArrowRotateRight,
  FaClock,
  FaCheck,
  FaBoxesPacking,
  FaTruckFast,
  FaBan,
  FaMoneyBillWave,
  FaChevronLeft,
  FaChevronRight,
  FaFileInvoiceDollar,
} from "react-icons/fa6";

interface OrderItem {
  id: string;
  orderCode: string;
  fullName?: string;
  name?: string;
  lastname?: string;
  phone: string;
  email: string;
  province?: string;
  district?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  products?: any[];
}

interface OrderStats {
  total: number;
  pending: number;
  pendingPayment: number;
  paid: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/orders/stats?dateRange=${dateRangeFilter}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching order stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [dateRangeFilter]);

  // Fetch Orders List
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        dateRange: dateRangeFilter,
      });

      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const res = await apiClient.get(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalOrders(data.pagination.total || 0);
        }
      } else {
        // Fallback to legacy endpoint if admin endpoint returns 404
        const legacyRes = await apiClient.get("/api/orders");
        if (legacyRes.ok) {
          const legData = await legacyRes.json();
          setOrders(legData.orders || (Array.isArray(legData) ? legData : []));
          setTotalOrders(legData.orders?.length || 0);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error("Error fetching admin orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, paymentStatusFilter, paymentMethodFilter, dateRangeFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setPaymentMethodFilter("ALL");
    setDateRangeFilter("all");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FaCheck className="text-[10px]" /> Giao thành công
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <FaTruckFast className="text-[10px]" /> Đang giao hàng
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FaBoxesPacking className="text-[10px]" /> Đang in 3D
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FaCheck className="text-[10px]" /> Đã xác nhận
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <FaBan className="text-[10px]" /> Đã hủy
          </span>
        );
      case "PENDING_PAYMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <FaClock className="text-[10px]" /> Chờ thanh toán SePay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FaClock className="text-[10px]" /> Chờ duyệt
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string, method: string) => {
    const isPaid = status?.toUpperCase() === "PAID";
    const isCOD = method?.toUpperCase() === "COD";

    if (isPaid) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
          ĐÃ THANH TOÁN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
        {isCOD ? "THU COD" : "CHƯA THANH TOÁN"}
      </span>
    );
  };

  return (
    <div className="w-full flex-1 bg-[#FAF9F6] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E06D53] uppercase tracking-wider">
            <span>Craft3D Boutique Admin</span>
            <span>•</span>
            <span>Order Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1E2229] mt-1">
            Quản Lý Đơn Hàng Móc Khóa In 3D
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi chi tiết yêu cầu khắc tên, trạng thái thanh toán SePay VietQR và quy trình in 3D cá nhân hóa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => { setDateRangeFilter("today"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${dateRangeFilter === "today" ? "bg-white text-[#1E2229] shadow-xs font-bold" : "text-gray-500 hover:text-[#1E2229]"}`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => { setDateRangeFilter("7d"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${dateRangeFilter === "7d" ? "bg-white text-[#1E2229] shadow-xs font-bold" : "text-gray-500 hover:text-[#1E2229]"}`}
            >
              7 ngày
            </button>
            <button
              onClick={() => { setDateRangeFilter("30d"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${dateRangeFilter === "30d" ? "bg-white text-[#1E2229] shadow-xs font-bold" : "text-gray-500 hover:text-[#1E2229]"}`}
            >
              30 ngày
            </button>
            <button
              onClick={() => { setDateRangeFilter("all"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${dateRangeFilter === "all" ? "bg-white text-[#1E2229] shadow-xs font-bold" : "text-gray-500 hover:text-[#1E2229]"}`}
            >
              Tất cả
            </button>
          </div>

          <button
            onClick={() => { fetchStats(); fetchOrders(); }}
            className="p-2.5 rounded-xl border border-[#E7E5E4] bg-white text-gray-600 hover:text-[#E06D53] hover:border-[#E06D53] transition-colors shadow-xs"
            title="Làm mới dữ liệu"
          >
            <FaArrowRotateRight className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Đơn Hàng</span>
            <FaFileInvoiceDollar className="text-base text-[#1E2229]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#1E2229]">{stats?.total ?? "..."}</span>
            <span className="text-[11px] font-semibold text-gray-400">đơn</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ Xử Lý / TT</span>
            <FaClock className="text-base text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">
              {(stats ? (stats.pending + stats.pendingPayment) : "...")}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">
              {stats?.pendingPayment ? `${stats.pendingPayment} SePay` : "đang chờ"}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase tracking-wider">Đang In 3D & Chế Tác</span>
            <FaBoxesPacking className="text-base text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-700">
              {(stats ? (stats.confirmed + stats.processing) : "...")}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600">tại xưởng</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Đã Giao / Thành Công</span>
            <FaCheck className="text-base text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{stats?.delivered ?? "..."}</span>
            <span className="text-[11px] font-semibold text-emerald-600">hoàn tất</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#E06D53]">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh Thu Thu Được</span>
            <FaMoneyBillWave className="text-base text-[#E06D53]" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold text-[#E06D53]">
              {stats ? formatVND(stats.totalRevenue) : "..."}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (MK-...), tên khách, số điện thoại, email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl focus:bg-white focus:outline-none focus:border-[#E06D53] text-[#1E2229]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl focus:outline-none focus:border-[#E06D53] text-[#1E2229] font-medium"
          >
            <option value="ALL">Mọi trạng thái đơn</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán SePay</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PROCESSING">Đang in 3D & chế tác</option>
            <option value="SHIPPED">Đang giao hàng</option>
            <option value="DELIVERED">Đã giao thành công</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl focus:outline-none focus:border-[#E06D53] text-[#1E2229] font-medium"
          >
            <option value="ALL">Mọi trạng thái thanh toán</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAID">Đã thanh toán (SePay/COD)</option>
            <option value="FAILED">Thanh toán thất bại</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl focus:outline-none focus:border-[#E06D53] text-[#1E2229] font-medium"
          >
            <option value="ALL">Mọi phương thức</option>
            <option value="COD">Tiền mặt khi nhận (COD)</option>
            <option value="SEPAY">SePay VietQR</option>
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-[#E06D53] hover:bg-rose-50 rounded-xl border border-gray-200 transition-colors"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* 4. Orders Data Table */}
      <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-[#E7E5E4] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã Đơn & Phương Thức</th>
                <th className="py-3.5 px-4">Ngày Đặt</th>
                <th className="py-3.5 px-4">Khách Hàng & Địa Chỉ</th>
                <th className="py-3.5 px-4">Thanh Toán</th>
                <th className="py-3.5 px-4">Tổng Tiền</th>
                <th className="py-3.5 px-4">Trạng Thái Đơn</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#E06D53] border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const customerName = order.fullName || `${order.lastname || ""} ${order.name || ""}`.trim() || "Khách vãng lai";
                  const isSepay = order.paymentMethod?.toUpperCase().includes("SEPAY");

                  return (
                    <tr key={order.id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      {/* 1. Mã đơn & Phương thức */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-[#E06D53]">
                            {order.orderCode}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            {isSepay ? "VietQR (SePay)" : "Tiền mặt (COD)"}
                          </span>
                        </div>
                      </td>

                      {/* 2. Ngày đặt */}
                      <td className="py-3.5 px-4 text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        }) : "N/A"}
                      </td>

                      {/* 3. Khách hàng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1E2229]">{customerName}</div>
                        <div className="text-[11px] text-gray-400">
                          {order.phone} {order.province ? `• ${order.province}` : ""}
                        </div>
                      </td>

                      {/* 4. Trạng thái thanh toán */}
                      <td className="py-3.5 px-4">
                        {getPaymentBadge(order.paymentStatus, order.paymentMethod)}
                      </td>

                      {/* 5. Tổng tiền */}
                      <td className="py-3.5 px-4 font-extrabold text-[#1E2229]">
                        {formatVND(order.total)}
                      </td>

                      {/* 6. Trạng thái đơn */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* 7. Nút xem chi tiết */}
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-[#1E2229] hover:text-white hover:border-[#1E2229] text-xs font-semibold transition-all shadow-xs"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <p className="text-sm font-semibold text-gray-500">Không tìm thấy đơn hàng nào phù hợp</p>
                    <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc tìm kiếm hoặc làm mới dữ liệu</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="p-4 border-t border-[#E7E5E4] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Hiển thị <span className="font-bold text-[#1E2229]">{orders.length}</span> trên tổng số{" "}
            <span className="font-bold text-[#1E2229]">{totalOrders}</span> đơn hàng
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft className="text-[10px]" />
            </button>
            <span className="font-medium text-gray-700 px-2">
              Trang {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronRight className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
