"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { orderService, paymentService } from "@/services/apiService";
import { CustomerOrder } from "@/types/order";
import {
  FaCircleCheck,
  FaTruck,
  FaClock,
  FaWandMagicSparkles,
  FaArrowRight,
  FaMagnifyingGlass,
  FaQrcode,
  FaRotate,
  FaTriangleExclamation,
  FaSpinner,
} from "react-icons/fa6";
import { sanitize } from "@/lib/sanitize";
import { formatVND } from "@/types/cart";
import toast from "react-hot-toast";

// Helper để submit form SePay Gateway ẩn
function submitSepayForm(actionUrl: string, fields: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  const formEl = document.createElement("form");
  formEl.method = "POST";
  formEl.action = actionUrl;
  formEl.style.display = "none";

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    formEl.appendChild(input);
  }

  document.body.appendChild(formEl);
  formEl.submit();
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const orderCode = params?.orderCode as string;
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const paymentStatusParam = searchParams.get("payment_status");

  const fetchOrder = useCallback(async () => {
    if (!orderCode) return;
    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("last_order_email") : null;
    const emailParam = storedEmail || searchParams.get("email") || "";

    try {
      setLoading(true);
      const data = await orderService.getById(orderCode, emailParam);
      setOrder(data);
    } catch (err: any) {
      console.error("Error fetching order confirmation:", err);
      setError(err.message || "Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [orderCode, searchParams]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Kiểm tra trạng thái thanh toán thủ công
  const handleCheckStatus = async () => {
    if (!order) return;
    setIsCheckingStatus(true);
    try {
      const statusData = await paymentService.getSepayStatus(order.orderCode);
      if (statusData.paymentStatus === "PAID") {
        toast.success("Thanh toán đã được xác nhận thành công!");
        setOrder((prev) => (prev ? { ...prev, paymentStatus: "PAID", status: statusData.status } : null));
      } else {
        toast("Hệ thống chưa nhận được thông báo thanh toán. Vui lòng thử lại sau 30 giây.", {
          icon: "⏳",
        });
      }
    } catch (err: any) {
      toast.error("Không thể kiểm tra trạng thái thanh toán lúc này.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Mở lại cổng thanh toán SePay để thanh toán
  const handlePayNow = async () => {
    if (!order) return;
    setIsRetryingPayment(true);
    try {
      toast.loading("Đang khởi tạo cổng thanh toán SePay...");
      const session = await paymentService.createSepayCheckoutSession(order.orderCode, order.email, order.phone);
      if (session && session.checkoutUrl && session.fields) {
        submitSepayForm(session.checkoutUrl, session.fields);
      } else {
        toast.error("Không thể tạo phiên thanh toán mới");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối cổng SePay");
    } finally {
      setIsRetryingPayment(false);
    }
  };

  // Tự động kiểm tra trạng thái nếu đơn hàng SePay đang ở trạng thái PENDING
  useEffect(() => {
    if (!order) return;
    const isSepayPending =
      (order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR") &&
      order.paymentStatus === "PENDING";

    if (!isSepayPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await paymentService.getSepayStatus(order.orderCode);
        if (res.paymentStatus === "PAID") {
          toast.success("Hệ thống đã nhận thanh toán SePay thành công!");
          setOrder((prev) => (prev ? { ...prev, paymentStatus: "PAID", status: res.status } : null));
          clearInterval(interval);
        }
      } catch (e) {
        // Silent poll error
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF9F6] py-16">
        <div className="w-12 h-12 border-4 border-[#E06D53] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 text-sm font-medium">Đang tải thông tin xác nhận đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF9F6] py-16 px-4 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-4 font-bold">
          !
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1E2229] mb-2">Không tìm thấy thông tin đơn hàng</h2>
        <p className="text-gray-500 text-xs sm:text-sm max-w-md mb-6">{error || "Vui lòng kiểm tra lại mã đơn hàng hoặc thông tin xác thực."}</p>
        <Link
          href="/order-lookup"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white font-semibold text-xs sm:text-sm hover:bg-[#2D323C] transition-all"
        >
          <FaMagnifyingGlass /> Đến trang tra cứu đơn hàng
        </Link>
      </div>
    );
  }

  const items = order.products || [];
  const isCOD = order.paymentMethod === "COD";
  const isSepay = order.paymentMethod === "SEPAY" || order.paymentMethod === "SEPAY_QR";
  const isPaid = order.paymentStatus === "PAID";
  const isCancelled = paymentStatusParam === "cancelled";

  // Lấy mã giao dịch SePay nếu có
  const sepayPayment = (order.payments || []).find((p) => p.provider === "SEPAY" && p.status === "SUCCESS");
  const txnRef = sepayPayment?.txnRef;

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-y-6">
        {/* THÔNG BÁO HỦY THANH TOÁN (NẾU USER BẤM HỦY TỪ SEPAY GATEWAY) */}
        {isCancelled && !isPaid && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <FaTriangleExclamation className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-950 font-bold mb-0.5">Giao dịch thanh toán chưa hoàn tất</strong>
              Bạn đã quay lại từ cổng thanh toán SePay. Đơn hàng vẫn được lưu ở trạng thái chờ thanh toán. Bạn có thể bấm nút &quot;Thanh toán ngay bằng VietQR&quot; bên dưới để hoàn tất đơn bất kỳ lúc nào.
            </div>
          </div>
        )}

        {/* BANNER TRẠNG THÁI */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E7E5E4] shadow-sm text-center">
          {isPaid ? (
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              <FaCircleCheck />
            </div>
          ) : isSepay ? (
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              <FaQrcode />
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              <FaCircleCheck />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] mb-2 tracking-tight">
            {isPaid
              ? "Thanh toán thành công!"
              : isSepay
              ? "Đơn hàng đang chờ thanh toán VietQR"
              : "Đặt hàng thành công!"}
          </h1>

          <p className="text-gray-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            {isPaid ? (
              <>
                Cảm ơn bạn, <strong>{order.fullName || `${order.lastname} ${order.name}`.trim()}</strong>! Hệ thống đã ghi nhận khoản thanh toán qua Cổng SePay. Xưởng đang ưu tiên in 3D & gia công chế tác sản phẩm cho bạn.
              </>
            ) : isSepay ? (
              <>
                Cảm ơn bạn, <strong>{order.fullName || `${order.lastname} ${order.name}`.trim()}</strong>! Đơn hàng của bạn đã được khởi tạo. Vui lòng quét mã VietQR để hoàn tất thanh toán.
              </>
            ) : (
              <>
                Cảm ơn bạn, <strong>{order.fullName || `${order.lastname} ${order.name}`.trim()}</strong>! Đơn hàng COD của bạn đã được xưởng tiếp nhận và sẽ sớm được gia công chế tác.
              </>
            )}
          </p>

          {/* HỘP TÓM TẮT MÃ ĐƠN & PHƯƠNG THỨC */}
          <div className="mt-6 p-5 rounded-2xl bg-[#FDF2EE] border border-[#E06D53]/20 inline-block text-left max-w-md w-full">
            <div className="flex justify-between items-center text-sm border-b border-[#E06D53]/20 pb-2.5 mb-2.5">
              <span className="text-gray-600 text-xs">Mã đơn hàng:</span>
              <strong className="text-base text-[#E06D53] font-mono tracking-wider font-extrabold">{order.orderCode}</strong>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Phương thức thanh toán:</span>
              <span className="font-semibold text-gray-800">
                {isCOD ? "COD (Thanh toán khi nhận hàng)" : "Chuyển khoản VietQR (Cổng SePay)"}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
              <span>Trạng thái thanh toán:</span>
              {isPaid ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <FaCircleCheck className="text-[10px]" /> ĐÃ THANH TOÁN
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <FaClock className="text-[10px]" /> CHỜ THANH TOÁN
                </span>
              )}
            </div>

            {txnRef && (
              <div className="flex justify-between items-center text-xs text-gray-600 mt-2 pt-2 border-t border-[#E06D53]/20">
                <span>Mã giao dịch (TxnRef):</span>
                <span className="font-mono font-bold text-gray-800">{txnRef}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
              <span>Trạng thái tiến độ:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800">
                {order.status}
              </span>
            </div>
          </div>

          {/* NÚT HÀNH ĐỘNG THANH TOÁN SEPAY KHI PENDING */}
          {isSepay && !isPaid && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
              <button
                onClick={handlePayNow}
                disabled={isRetryingPayment}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRetryingPayment ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" /> Đang chuyển hướng...
                  </>
                ) : (
                  <>
                    <FaQrcode className="text-sm" /> Thanh toán ngay bằng VietQR
                  </>
                )}
              </button>

              <button
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingStatus ? (
                  <>
                    <FaSpinner className="animate-spin text-sm" /> Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <FaRotate className="text-sm" /> Kiểm tra thanh toán
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* CHI TIẾT SẢN PHẨM & CÁ NHÂN HÓA */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E5E4] shadow-sm">
          <h2 className="text-base sm:text-lg font-bold text-[#1E2229] border-b border-gray-100 pb-3 mb-4">
            Sản phẩm đã đặt ({items.length} món)
          </h2>

          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="py-4 flex gap-4 text-xs sm:text-sm">
                <div className="w-16 h-16 rounded-xl border border-gray-100 bg-[#FAF9F6] flex-shrink-0 p-1 flex items-center justify-center">
                  <Image
                    src={
                      item.product?.mainImage
                        ? item.product.mainImage.startsWith("/")
                          ? item.product.mainImage
                          : `/${item.product.mainImage}`
                        : "/images/products/keychain-the-bai-front-back.jpg"
                    }
                    alt={item.productTitle}
                    width={64}
                    height={64}
                    className="object-contain w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1E2229] text-sm sm:text-base">{sanitize(item.productTitle)}</h3>
                  {item.sizeLabel && (
                    <p className="text-gray-500 mt-0.5 text-xs">
                      Kích thước: <strong>{item.sizeLabel}</strong> | Số lượng: <strong>{item.quantity}</strong>
                    </p>
                  )}

                  {/* Chi tiết khắc tên */}
                  {item.customText && (
                    <div className="mt-2 p-2 rounded-lg bg-[#FAF9F6] border border-gray-200 text-xs">
                      <span className="font-semibold text-gray-800 flex items-center gap-1">
                        <FaWandMagicSparkles className="text-[#E06D53]" />
                        Chữ khắc: <strong className="text-[#1E2229] uppercase">&quot;{item.customText}&quot;</strong>
                      </span>
                      {item.customFont && <span className="text-gray-400 block mt-0.5 text-[11px]">Font: {item.customFont}</span>}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-extrabold text-[#1E2229] text-sm sm:text-base">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {formatVND(item.unitPrice)} / món
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Chi tiết tài chính */}
          <div className="pt-4 border-t border-gray-100 mt-4 space-y-2 text-xs sm:text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-semibold text-[#1E2229]">{formatVND(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-[#1E2229]">
                {order.shippingFee === 0 ? (
                  <span className="text-emerald-600 font-bold">Miễn phí</span>
                ) : (
                  formatVND(order.shippingFee)
                )}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline text-sm sm:text-base font-bold text-[#1E2229]">
              <span>{isPaid ? "Số tiền đã thanh toán:" : isSepay ? "Số tiền cần thanh toán VietQR:" : "Tổng thanh toán khi nhận hàng:"}</span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#E06D53]">
                {formatVND(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN NHẬN HÀNG */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E5E4] shadow-sm text-xs sm:text-sm">
          <h2 className="text-base sm:text-lg font-bold text-[#1E2229] border-b border-gray-100 pb-3 mb-3 flex items-center gap-2">
            <FaTruck className="text-[#E06D53]" /> Địa chỉ giao hàng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Người nhận:</p>
              <p className="font-bold text-[#1E2229]">{order.fullName || `${order.lastname} ${order.name}`}</p>
              <p className="mt-1">SĐT: <strong>{order.phone}</strong></p>
              <p>Email: {order.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Địa chỉ phát hàng:</p>
              <p className="font-medium text-[#1E2229] leading-relaxed">
                {[order.addressDetail, order.ward, order.district, order.province].filter(Boolean).join(", ") || order.adress}
              </p>
              {order.orderNotice && (
                <p className="mt-2 text-xs text-gray-500 italic bg-[#FAF9F6] p-2 rounded-lg border border-gray-100">
                  Ghi chú: &quot;{order.orderNotice}&quot;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* HÀNH ĐỘNG TIẾP THEO */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="flex-1 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#1E2229] text-white hover:bg-[#2D323C] shadow-sm text-center transition-all"
          >
            Tiếp tục mua sắm
          </Link>
          <Link
            href="/order-lookup"
            className="flex-1 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 text-center transition-all flex items-center justify-center gap-2"
          >
            <FaMagnifyingGlass className="text-xs" /> Tra cứu tiến độ đơn hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
