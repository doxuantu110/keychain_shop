"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { DashboardSidebar } from "@/components";
import apiClient from "@/lib/api";
import { formatVND } from "@/types/cart";
import {
  FaArrowLeft,
  FaCheck,
  FaBoxesPacking,
  FaTruckFast,
  FaBan,
  FaPaperPlane,
  FaClock,
  FaEnvelope,
  FaCircleCheck,
  FaCircleExclamation,
  FaUser,
  FaLocationDot,
  FaCreditCard,
  FaNoteSticky,
  FaTimeline,
} from "react-icons/fa6";

interface OrderDetail {
  id: string;
  orderCode: string;
  fullName?: string;
  name?: string;
  lastname?: string;
  phone: string;
  email: string;
  province?: string;
  district?: string;
  ward?: string;
  addressDetail?: string;
  adress?: string;
  orderNotice?: string;
  internalNotes?: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  products: {
    id: string;
    productId: string;
    variantId?: string;
    productTitle: string;
    sizeLabel?: string;
    unitPrice: number;
    quantity: number;
    customText?: string;
    customFont?: string;
    customQrUrl?: string;
    snapshotSource?: string;
    product?: {
      id: string;
      title: string;
      slug: string;
      mainImage: string;
    };
  }[];
  payments: {
    id: string;
    provider: string;
    txnRef: string;
    amount: number;
    status: string;
    bankCode?: string;
    createdAt: string;
  }[];
  statusHistory: {
    id: string;
    fromStatus?: string;
    toStatus: string;
    note?: string;
    changedBy?: string;
    createdAt: string;
  }[];
  emailLogs?: {
    id: string;
    eventType: string;
    recipient: string;
    subject: string;
    status: string;
    retryCount: number;
    lastError?: string;
    sentAt?: string;
    createdAt: string;
  }[];
}

const AdminSingleOrder = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [carrier, setCarrier] = useState("Giao Hàng Nhanh (GHN)");
  const [trackingCode, setTrackingCode] = useState("");

  // Internal note state
  const [internalNoteText, setInternalNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Email resend state
  const [resendEventType, setResendEventType] = useState("ORDER_CONFIRMATION");
  const [resendLoading, setResendLoading] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setInternalNoteText(data.internalNotes || "");
      } else {
        toast.error("Không tìm thấy thông tin đơn hàng");
      }
    } catch (err: any) {
      console.error("Error fetching order detail:", err);
      toast.error("Lỗi khi tải chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // Handle status update
  const handleStatusTransition = async (nextStatus: string, extra: any = {}) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/api/admin/orders/${order.id}/status`, {
        status: nextStatus,
        ...extra,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái sang "${nextStatus}"`);
        setCancelModalOpen(false);
        setShipModalOpen(false);
        fetchOrderDetail();
      } else {
        toast.error(data.details || data.error || "Không thể chuyển trạng thái");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối khi cập nhật đơn hàng");
    } finally {
      setActionLoading(false);
    }
  };

  // Save internal notes
  const handleSaveInternalNotes = async () => {
    if (!order) return;
    setSavingNote(true);
    try {
      const res = await apiClient.post(`/api/admin/orders/${order.id}/notes`, {
        internalNotes: internalNoteText,
      });
      if (res.ok) {
        toast.success("Đã lưu ghi chú nội bộ");
        fetchOrderDetail();
      } else {
        toast.error("Không thể lưu ghi chú");
      }
    } catch (err: any) {
      toast.error("Lỗi khi lưu ghi chú");
    } finally {
      setSavingNote(false);
    }
  };

  // Resend email
  const handleResendEmail = async (outboxId?: string) => {
    if (!order) return;
    setResendLoading(true);
    try {
      const body = outboxId ? { outboxId } : { eventType: resendEventType };
      const res = await apiClient.post(`/api/admin/orders/${order.id}/resend-email`, body);
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Đã yêu cầu gửi lại email");
        fetchOrderDetail();
      } else {
        toast.error(data.details || "Không thể gửi lại email");
      }
    } catch (err: any) {
      toast.error("Lỗi khi gửi email");
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col xl:flex-row">
        <DashboardSidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-500 text-sm">
            <div className="w-8 h-8 border-3 border-[#E06D53] border-t-transparent rounded-full animate-spin"></div>
            <span>Đang tải thông tin đơn hàng #{params?.id}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col xl:flex-row">
        <DashboardSidebar />
        <div className="flex-1 p-8">
          <Link href="/admin/orders" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#E06D53]">
            <FaArrowLeft /> Quay lại danh sách
          </Link>
          <div className="mt-8 bg-white p-8 rounded-3xl border border-gray-200 text-center">
            <p className="text-gray-500">Đơn hàng không tồn tại hoặc đã bị xóa.</p>
          </div>
        </div>
      </div>
    );
  }

  const customerName = order.fullName || `${order.lastname || ""} ${order.name || ""}`.trim() || "Khách vãng lai";
  const address = [order.addressDetail, order.ward, order.district, order.province].filter(Boolean).join(", ") || order.adress || "Chưa cung cấp";
  const isSepay = order.paymentMethod?.toUpperCase().includes("SEPAY");
  const isPaid = order.paymentStatus?.toUpperCase() === "PAID";

  return (
    <div className="bg-[#FAF9F6] min-h-screen flex flex-col xl:flex-row">
      <DashboardSidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 1. Header Navigation & Code */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs">
          <div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E06D53] transition-colors mb-2"
            >
              <FaArrowLeft className="text-[10px]" /> Quay lại danh sách đơn hàng
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-[#1E2229] font-mono">
                #{order.orderCode}
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {isPaid ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Thời gian đặt hàng: {new Date(order.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          {/* Status badge & Current State */}
          <div className="flex flex-col md:items-end">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Trạng Thái Hiện Tại</span>
            <div className="mt-1">
              <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide bg-[#1E2229] text-white">
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* 2. State Machine Action Bar */}
        <div className="bg-white p-5 rounded-3xl border border-[#E7E5E4] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#1E2229]">Hành Động Chuyển Trạng Thái</h3>
              <p className="text-xs text-gray-400">
                Chỉ cho phép chuyển tiếp theo đúng quy trình xưởng Craft3D
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PENDING / PENDING_PAYMENT */}
              {(order.status === "PENDING" || order.status === "PENDING_PAYMENT") && (
                <button
                  onClick={() => handleStatusTransition("CONFIRMED", { note: "Admin xác nhận đơn hàng" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <FaCheck className="text-[11px]" /> Xác nhận đơn hàng
                </button>
              )}

              {/* CONFIRMED */}
              {order.status === "CONFIRMED" && (
                <button
                  onClick={() => handleStatusTransition("PROCESSING", { note: "Bắt đầu chạy máy in 3D và chuẩn bị phôi" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <FaBoxesPacking className="text-[11px]" /> Bắt đầu in 3D & chế tác
                </button>
              )}

              {/* PROCESSING */}
              {order.status === "PROCESSING" && (
                <button
                  onClick={() => setShipModalOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <FaTruckFast className="text-[11px]" /> Bàn giao bưu tá (Đang giao)
                </button>
              )}

              {/* SHIPPED */}
              {order.status === "SHIPPED" && (
                <button
                  onClick={() => handleStatusTransition("DELIVERED", { note: "Khách đã nhận hàng thành công" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <FaCheck className="text-[11px]" /> Xác nhận giao thành công
                </button>
              )}

              {/* CANCEL ACTION (Allowed from PENDING, PENDING_PAYMENT, CONFIRMED, PROCESSING, SHIPPED) */}
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <FaBan className="text-[11px]" /> Hủy đơn hàng
                </button>
              )}

              {/* TERMINAL STATUS */}
              {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
                <span className="text-xs font-semibold text-gray-400 italic">
                  Đơn hàng đã kết thúc vòng đời ({order.status === "DELIVERED" ? "Hoàn tất" : "Đã hủy"}).
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Order Items & Customization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Box */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs">
              <h2 className="text-base font-extrabold text-[#1E2229] mb-4">
                Sản Phẩm & Chi Tiết Cá Nhân Hóa ({order.products?.length || 0})
              </h2>

              <div className="divide-y divide-gray-100">
                {order.products?.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0 overflow-hidden relative">
                      <Image
                        src={item.product?.mainImage || "/images/products/keychain-the-bai-front-back.jpg"}
                        alt={item.productTitle}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-[#1E2229]">{item.productTitle}</h4>
                          {item.sizeLabel && (
                            <span className="text-xs text-gray-500 font-medium">
                              Kích thước: <strong>{item.sizeLabel}</strong>
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-[#1E2229]">
                            {formatVND(item.unitPrice * item.quantity)}
                          </span>
                          <div className="text-[11px] text-gray-400">
                            {formatVND(item.unitPrice)} × {item.quantity}
                          </div>
                        </div>
                      </div>

                      {/* 3D Customization Card */}
                      {(item.customText || item.customFont || item.customQrUrl) && (
                        <div className="mt-3 p-3 rounded-xl bg-[#FAF9F6] border border-[#F5E6E0] text-xs space-y-1">
                          <div className="text-[11px] font-bold text-[#E06D53] uppercase tracking-wider">
                            ✨ Thông tin khắc laser in 3D:
                          </div>
                          {item.customText && (
                            <div className="text-gray-700">
                              Nội dung chữ: <strong className="font-mono text-[#E06D53] bg-white px-1.5 py-0.5 rounded border border-rose-200">&ldquo;{item.customText}&rdquo;</strong>
                            </div>
                          )}
                          {item.customFont && (
                            <div className="text-gray-600">
                              Kiểu chữ / Font: <span className="font-semibold">{item.customFont}</span>
                            </div>
                          )}
                          {item.customQrUrl && (
                            <div className="text-gray-600 truncate">
                              Link QR khắc mặt sau: <a href={item.customQrUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{item.customQrUrl}</a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-xs space-y-2">
                <div className="flex justify-between text-gray-500">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-semibold text-gray-700">{formatVND(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-gray-700">
                    {order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#1E2229] pt-2 border-t border-gray-200">
                  <span>Tổng giá trị đơn hàng:</span>
                  <span className="text-lg text-[#E06D53]">{formatVND(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Email Outbox Logs & Resend */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#1E2229]">
                    Lịch Sử Gửi Email Thông Báo ({order.emailLogs?.length || 0})
                  </h3>
                  <p className="text-xs text-gray-400">
                    Hàng đợi Outbox bền bỉ - Tự động ghi nhận và chống spam trùng lặp
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={resendEventType}
                    onChange={(e) => setResendEventType(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-gray-200 rounded-xl text-[#1E2229] font-medium"
                  >
                    <option value="ORDER_CONFIRMATION">Xác nhận đơn hàng</option>
                    <option value="PAYMENT_INSTRUCTIONS">Hướng dẫn VietQR SePay</option>
                    <option value="PAYMENT_SUCCESS">Thanh toán thành công</option>
                    <option value="ORDER_CONFIRMED">Đã xác nhận đơn</option>
                    <option value="ORDER_SHIPPED">Đang giao hàng</option>
                    <option value="ORDER_DELIVERED">Đã giao thành công</option>
                    <option value="ORDER_CANCELLED">Thông báo hủy đơn</option>
                  </select>

                  <button
                    onClick={() => handleResendEmail()}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#E06D53] transition-colors shadow-xs disabled:opacity-50"
                  >
                    <FaPaperPlane className="text-[10px]" /> Gửi email
                  </button>
                </div>
              </div>

              {order.emailLogs && order.emailLogs.length > 0 ? (
                <div className="space-y-3">
                  {order.emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl border border-gray-100 bg-[#FAF9F6] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E2229]">{log.eventType}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "SENT" ? "bg-emerald-100 text-emerald-800" :
                            log.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          Tới: {log.recipient} • Thời gian: {new Date(log.createdAt).toLocaleString("vi-VN")}
                          {log.retryCount > 0 && ` • Số lần thử: ${log.retryCount}`}
                        </div>
                        {log.lastError && (
                          <div className="text-[11px] text-rose-600 font-mono">
                            Lỗi: {log.lastError}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleResendEmail(log.id)}
                        disabled={resendLoading}
                        className="self-end sm:self-center px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-700 transition-colors"
                      >
                        Gửi lại
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Chưa có bản ghi email nào trong hàng đợi.</p>
              )}
            </div>

            {/* Order Timeline (OrderStatusHistory) */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-[#1E2229]">
                Dòng Thời Gian Đơn Hàng (Status History)
              </h3>

              <div className="space-y-4 border-l-2 border-gray-100 ml-2 pl-4">
                {order.statusHistory?.map((hist) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#E06D53] border-2 border-white"></div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E2229]">
                          {hist.fromStatus ? `${hist.fromStatus} → ` : ""}{hist.toStatus}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(hist.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{hist.note}</p>
                      <span className="text-[10px] text-gray-400">Thực hiện bởi: {hist.changedBy || "Hệ thống"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Customer, Payment, Internal Notes */}
          <div className="space-y-6">
            {/* Customer Box */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1E2229] font-extrabold text-sm border-b border-gray-100 pb-3">
                <FaUser className="text-[#E06D53]" />
                <span>Thông Tin Khách Hàng</span>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <span className="text-gray-400">Họ và tên:</span>
                  <p className="font-bold text-[#1E2229] text-sm">{customerName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Số điện thoại:</span>
                  <p className="font-mono font-bold text-[#1E2229]">{order.phone}</p>
                </div>
                <div>
                  <span className="text-gray-400">Email nhận thông báo:</span>
                  <p className="text-[#1E2229] font-medium">{order.email}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address Box */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1E2229] font-extrabold text-sm border-b border-gray-100 pb-3">
                <FaLocationDot className="text-[#E06D53]" />
                <span>Địa Chỉ Giao Hàng</span>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-gray-700 leading-relaxed font-medium">{address}</p>
                {order.orderNotice && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold">Ghi chú từ khách:</span>
                    <p className="italic mt-0.5">&ldquo;{order.orderNotice}&rdquo;</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & SePay Info */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1E2229] font-extrabold text-sm border-b border-gray-100 pb-3">
                <FaCreditCard className="text-[#E06D53]" />
                <span>Giao Dịch Thanh Toán</span>
              </div>

              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Phương thức:</span>
                  <span className="font-bold text-[#1E2229]">
                    {isSepay ? "SePay VietQR" : "Tiền mặt (COD)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trạng thái:</span>
                  <span className="font-bold text-[#1E2229]">{order.paymentStatus}</span>
                </div>

                {order.payments && order.payments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Lịch sử giao dịch:</span>
                    {order.payments.map((p) => (
                      <div key={p.id} className="p-2 rounded-lg bg-gray-50 border border-gray-200/60 text-[11px]">
                        <div className="flex justify-between font-mono font-bold">
                          <span>{p.provider}</span>
                          <span>{formatVND(p.amount)}</span>
                        </div>
                        <div className="text-gray-400 mt-0.5 truncate">
                          Mã GD: {p.txnRef} ({p.status})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Private Internal Notes */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E5E4] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1E2229] font-extrabold text-sm border-b border-gray-100 pb-3">
                <FaNoteSticky className="text-[#E06D53]" />
                <span>Ghi Chú Nội Bộ (Admin Only)</span>
              </div>

              <div className="text-xs space-y-2">
                <p className="text-gray-400 text-[11px]">
                  Ghi chú này được bảo mật và chỉ hiển thị cho nhân viên quản trị xưởng Craft3D.
                </p>

                <textarea
                  rows={4}
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Ghi chú về thiết kế, hẹn giờ giao, hoặc thỏa thuận đặc biệt..."
                  className="w-full p-3 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl focus:bg-white focus:outline-none focus:border-[#E06D53] text-[#1E2229]"
                />

                <button
                  onClick={handleSaveInternalNotes}
                  disabled={savingNote}
                  className="w-full py-2 rounded-xl bg-[#1E2229] hover:bg-[#E06D53] text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {savingNote ? "Đang lưu..." : "Lưu ghi chú nội bộ"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL 1: Ship Order Dialog */}
        {shipModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-200">
              <h3 className="text-base font-extrabold text-[#1E2229]">
                Bàn Giao Bưu Tá (Chuyển sang ĐANG GIAO)
              </h3>
              <p className="text-xs text-gray-500">
                Nhập thông tin đơn vị vận chuyển và mã bưu tá để gửi thông báo cho khách hàng.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Đơn vị vận chuyển:</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mã vận đơn bưu phẩm (nếu có):</label>
                  <input
                    type="text"
                    placeholder="VD: GHN98726354VN"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShipModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleStatusTransition("SHIPPED", { carrier, trackingCode })}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                >
                  {actionLoading ? "Đang lưu..." : "Xác nhận gửi hàng"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Cancel Order Dialog */}
        {cancelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-200">
              <h3 className="text-base font-extrabold text-rose-700">
                Xác Nhận Hủy Đơn Hàng #{order.orderCode}
              </h3>
              <p className="text-xs text-gray-500">
                Hệ thống sẽ hoàn lại số lượng tồn kho thực tế cho sản phẩm (không bao gồm preorder) và gửi email thông báo hủy đơn cho khách hàng.
              </p>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-gray-700 block">Lý do hủy đơn:</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Khách đổi ý, không liên lạc được, hoặc lý do kỹ thuật in 3D..."
                  className="w-full p-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => handleStatusTransition("CANCELLED", { reason: cancelReason })}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                >
                  {actionLoading ? "Đang hủy..." : "Xác nhận hủy đơn"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSingleOrder;
