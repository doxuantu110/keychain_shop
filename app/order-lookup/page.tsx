"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { orderService } from "@/services/apiService";
import { CustomerOrder, OrderStatus } from "@/types/order";
import { formatVND } from "@/types/cart";
import { 
  FaMagnifyingGlass, 
  FaBoxOpen, 
  FaTruckFast, 
  FaCheck, 
  FaClock, 
  FaXmark,
  FaArrowLeft,
  FaPhone,
  FaShieldHalved,
  FaReceipt,
  FaCircleInfo
} from "react-icons/fa6";

const STATUS_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "PENDING", label: "Chờ xác nhận", desc: "Đơn hàng đã được tạo thành công" },
  { status: "CONFIRMED", label: "Đã xác nhận", desc: "Cửa hàng đã tiếp nhận đơn hàng" },
  { status: "PROCESSING", label: "Đang sản xuất", desc: "Đang tiến hành khắc tên & gia công" },
  { status: "SHIPPED", label: "Đang giao hàng", desc: "Đơn hàng đang trên đường giao đến bạn" },
  { status: "DELIVERED", label: "Giao thành công", desc: "Đã giao hàng và thanh toán" },
];

function getStatusStepIndex(status: string): number {
  switch (status?.toUpperCase()) {
    case "PENDING": return 0;
    case "CONFIRMED": return 1;
    case "PROCESSING": return 2;
    case "SHIPPED": return 3;
    case "DELIVERED": return 4;
    case "CANCELLED": return -1;
    default: return 0;
  }
}

export default function OrderLookupPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const initialContact = searchParams.get("contact") || searchParams.get("phone") || searchParams.get("email") || "";

  const [orderCodeInput, setOrderCodeInput] = useState(initialCode);
  const [contactInput, setContactInput] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  const handleLookup = async (codeToUse?: string, contactToUse?: string) => {
    const code = (codeToUse !== undefined ? codeToUse : orderCodeInput).trim();
    const contact = (contactToUse !== undefined ? contactToUse : contactInput).trim();

    if (!code) {
      setError("Vui lòng nhập mã đơn hàng (ví dụ: MK-261114-XXXX).");
      return;
    }
    if (!contact) {
      setError("Vui lòng nhập Email hoặc Số điện thoại đặt hàng để xác thực quyền xem đơn hàng.");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    const isEmail = contact.includes("@");
    const verifyEmail = isEmail ? contact : undefined;
    const verifyPhone = !isEmail ? contact : undefined;

    try {
      const data = await orderService.lookup(code, verifyEmail, verifyPhone);
      setOrder(data);
    } catch (err: any) {
      if (err.status === 404) {
        setError("Không tìm thấy đơn hàng với mã vừa nhập. Vui lòng kiểm tra lại mã đơn hàng.");
      } else if (err.status === 403) {
        setError("Thông tin xác thực không đúng. Email hoặc Số điện thoại không khớp với người đặt đơn hàng này.");
      } else {
        setError(err.message || "Không thể tra cứu đơn hàng vào lúc này. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialContact) {
      handleLookup(initialCode, initialContact);
    }
  }, []);

  const currentStep = order ? getStatusStepIndex(order.status) : 0;
  const isCancelled = order?.status === "CANCELLED";

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-700 hover:text-[#E06D53] transition-colors">
            <FaArrowLeft className="mr-2 text-xs" /> Quay lại trang chủ
          </Link>
          <div className="flex items-center text-xs text-gray-500">
            <FaShieldHalved className="mr-1 text-emerald-600" /> Tra cứu bảo mật bởi hệ thống Craft3D
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] tracking-tight">Tra Cứu Đơn Hàng</h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            Kiểm tra trạng thái in 3D, khắc laser và tiến độ vận chuyển đơn hàng móc khóa & phụ kiện của bạn.
          </p>
        </div>

        {/* Lookup Search Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E7E5E4] p-6 sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã đơn hàng <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaReceipt className="text-xs" />
                  </div>
                  <input
                    type="text"
                    value={orderCodeInput}
                    onChange={(e) => setOrderCodeInput(e.target.value)}
                    placeholder="VD: MK-261114-1234"
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại hoặc Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaPhone className="text-xs" />
                  </div>
                  <input
                    type="text"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder="Số điện thoại hoặc Email đặt hàng"
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1E2229] hover:bg-[#E06D53] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <FaMagnifyingGlass className="text-xs" />
                    Tra cứu đơn hàng
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <FaCircleInfo className="text-rose-500 mt-0.5 shrink-0" />
              <div className="text-xs sm:text-sm text-rose-700">{error}</div>
            </div>
          )}
        </div>

        {/* Order Details Result */}
        {order && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E7E5E4] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#FAF9F6] text-gray-700 rounded-md border border-gray-200">
                    Mã đơn hàng
                  </span>
                  <span className="text-lg font-bold font-mono text-[#E06D53]">{order.orderCode}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Thời gian đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>

              <div>
                {isCancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    <FaXmark /> Đã hủy đơn hàng
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                    order.status === "DELIVERED" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : order.status === "SHIPPED"
                      ? "bg-[#FDF2EE] text-[#E06D53] border border-[#E06D53]/20"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    <FaClock /> {STATUS_STEPS[currentStep]?.label || order.status}
                  </span>
                )}
              </div>
            </div>

            {/* Status Progress Stepper */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E7E5E4] p-6 sm:p-8">
              <h3 className="text-sm font-bold text-[#1E2229] mb-6">Tiến Độ Đơn Hàng</h3>

              {isCancelled ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs sm:text-sm text-rose-700">
                  <p className="font-semibold">Đơn hàng này đã bị hủy.</p>
                  <p className="text-xs text-rose-600 mt-1">Nếu có thắc mắc hoặc cần khôi phục đơn, vui lòng liên hệ bộ phận hỗ trợ khách hàng.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Step bar */}
                  <div className="hidden sm:grid sm:grid-cols-5 relative">
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0">
                      <div 
                        className="h-full bg-[#E06D53] transition-all duration-500" 
                        style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
                      />
                    </div>

                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step.status} className="flex flex-col items-center text-center relative z-10 px-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                              isDone
                                ? "bg-[#E06D53] text-white ring-4 ring-[#E06D53]/20"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {isDone ? <FaCheck className="text-xs" /> : idx + 1}
                          </div>
                          <div className={`mt-2 text-xs font-semibold ${isCurrent ? "text-[#E06D53] font-bold" : isDone ? "text-gray-900" : "text-gray-400"}`}>
                            {step.label}
                          </div>
                          <div className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                            {step.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile vertical stepper */}
                  <div className="sm:hidden space-y-4">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step.status} className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                              isDone
                                ? "bg-[#E06D53] text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {isDone ? <FaCheck className="text-[10px]" /> : idx + 1}
                          </div>
                          <div>
                            <div className={`text-xs font-semibold ${isCurrent ? "text-[#E06D53] font-bold" : isDone ? "text-gray-900" : "text-gray-400"}`}>
                              {step.label}
                            </div>
                            <div className="text-[11px] text-gray-500">{step.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status history log if available */}
              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lịch Sử Trạng Thái Chi Tiết</h4>
                  <div className="space-y-2">
                    {order.statusHistory.map((hist) => (
                      <div key={hist.id} className="text-xs flex items-center justify-between text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{hist.toStatus}</span>
                          {hist.note && <span className="text-gray-500">- {hist.note}</span>}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(hist.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recipient & Shipping Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaTruckFast className="text-blue-600" /> Thông Tin Giao Hàng
                </h3>
                <dl className="text-xs space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Người nhận:</dt>
                    <dd className="font-medium text-gray-900">{order.fullName || `${order.name} ${order.lastname}`}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Số điện thoại:</dt>
                    <dd className="font-medium text-gray-900">{order.phone}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd className="font-medium text-gray-900">{order.email}</dd>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <dt className="text-gray-500 mb-1">Địa chỉ nhận hàng:</dt>
                    <dd className="font-medium text-gray-900 leading-relaxed">
                      {order.addressDetail ? `${order.addressDetail}, ` : ""}
                      {order.ward ? `${order.ward}, ` : ""}
                      {order.district ? `${order.district}, ` : ""}
                      {order.province || order.adress}
                    </dd>
                  </div>
                  {order.orderNotice && (
                    <div className="pt-2 border-t border-gray-100">
                      <dt className="text-gray-500 mb-1">Ghi chú giao hàng:</dt>
                      <dd className="italic text-gray-700 bg-gray-50 p-2 rounded">{order.orderNotice}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaReceipt className="text-blue-600" /> Thanh Toán & Đơn Hàng
                </h3>
                <dl className="text-xs space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Phương thức:</dt>
                    <dd className="font-semibold text-gray-900">
                      {order.paymentMethod === "COD"
                        ? "Thanh toán khi nhận hàng (COD)"
                        : order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR"
                        ? "Chuyển khoản VietQR (Cổng SePay)"
                        : order.paymentMethod}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Trạng thái thanh toán:</dt>
                    <dd className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      order.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {order.paymentStatus === "PAID"
                        ? "ĐÃ THANH TOÁN"
                        : order.paymentMethod === "COD"
                        ? "CHƯA THANH TOÁN (THU TIỀN KHI GIAO)"
                        : "CHỜ CHUYỂN KHOẢN VIETQR"}
                    </dd>
                  </div>
                  {(order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR") && order.paymentStatus !== "PAID" && (
                    <div className="pt-2 border-t border-gray-100 text-right">
                      <Link
                        href={`/order-confirmation/${order.orderCode}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all"
                      >
                        Thanh toán ngay bằng VietQR &rarr;
                      </Link>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tạm tính:</dt>
                      <dd className="font-medium text-gray-900">{formatVND(order.subtotal || order.total)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phí vận chuyển:</dt>
                      <dd className="font-medium text-gray-900">
                        {order.shippingFee === 0 ? (
                          <span className="text-green-600 font-semibold">Miễn phí (Freeship)</span>
                        ) : (
                          formatVND(order.shippingFee)
                        )}
                      </dd>
                    </div>
                    {typeof order.discountAmount === "number" && order.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <dt>Giảm giá:</dt>
                        <dd>-{formatVND(order.discountAmount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-bold text-gray-900">
                      <dt>Tổng tiền COD:</dt>
                      <dd className="text-blue-600 text-base">{formatVND(order.total)}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            {/* Itemized Order Products */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FaBoxOpen className="text-blue-600" /> Danh Sách Sản Phẩm Khắc Tên ({order.products?.length || 0})
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {order.products?.map((item) => {
                  let customData: any = {};
                  try {
                    if (item.customizationJson) {
                      customData = typeof item.customizationJson === "string" 
                        ? JSON.parse(item.customizationJson) 
                        : item.customizationJson;
                    }
                  } catch (e) {}

                  const customText = item.customTextSnapshot || customData.customText;
                  const fontFamily = customData.fontFamily;
                  const qrCodeUrl = customData.qrCodeUrl;
                  const customNotes = customData.notes;

                  return (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                        {item.product?.mainImage ? (
                          <img
                            src={
                              item.product.mainImage.startsWith("/")
                                ? item.product.mainImage
                                : `/${item.product.mainImage}`
                            }
                            alt={item.productTitleSnapshot || item.product?.title || "Sản phẩm"}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaBoxOpen />
                          </div>
                        )}
                      </div>

                      {/* Product & Engraving Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">
                              {item.productTitleSnapshot || item.product?.title}
                            </h4>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.variantNameSnapshot || item.variant?.sizeLabel || "Tiêu chuẩn"} 
                              {item.skuSnapshot ? ` • SKU: ${item.skuSnapshot}` : ""}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-600">
                              {formatVND((item.unitPrice ?? item.priceSnapshot ?? 0) * item.quantity)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatVND(item.unitPrice ?? item.priceSnapshot ?? 0)} x {item.quantity}
                            </div>
                          </div>
                        </div>

                        {/* Customization Details Box */}
                        {(customText || qrCodeUrl || customNotes) && (
                          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1">
                            <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                              <span>✍️ Nội dung cá nhân hóa:</span>
                            </div>
                            {customText && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500">Chữ khắc:</span>
                                <span 
                                  className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-blue-200"
                                  style={{ fontFamily: fontFamily || "inherit" }}
                                >
                                  {customText}
                                </span>
                                {fontFamily && (
                                  <span className="text-[11px] text-gray-400">({fontFamily})</span>
                                )}
                              </div>
                            )}
                            {qrCodeUrl && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Mã QR:</span>
                                <span className="font-mono text-[11px] text-blue-700 truncate max-w-xs">{qrCodeUrl}</span>
                              </div>
                            )}
                            {customNotes && (
                              <div className="flex items-start gap-2">
                                <span className="text-gray-500">Ghi chú mẫu:</span>
                                <span className="text-gray-700 italic">{customNotes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <Link
                href="/shop"
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg text-center transition-colors"
              >
                Tiếp tục mua hàng
              </Link>
              <div className="text-xs text-gray-500 text-center sm:text-right">
                Cần hỗ trợ về đơn hàng? Hotline hỗ trợ: <span className="font-bold text-blue-600">0987.654.321</span> (8:00 - 21:00)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

