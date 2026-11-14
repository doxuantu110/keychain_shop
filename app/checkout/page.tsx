"use client";

import { SectionTitle } from "@/components";
import { useProductStore } from "../_zustand/store";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { orderService, paymentService } from "@/services/apiService";
import { FaTruck, FaShieldHalved, FaWandMagicSparkles, FaSpinner, FaArrowLeft, FaCheck, FaQrcode } from "react-icons/fa6";
import Link from "next/link";
import { sanitize } from "@/lib/sanitize";

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { products, total, clearCart } = useProductStore();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    province: "Hà Nội",
    district: "Cầu Giấy",
    ward: "Dịch Vọng Hậu",
    addressDetail: "",
    orderNotice: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "SEPAY">("COD");

  // Hàm submit form ẩn sang SePay Gateway
  const submitSepayForm = (actionUrl: string, fields: Record<string, string | number>) => {
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
  };

  // Sinh Idempotency Key ổn định cho phiên checkout này
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const generated = window.crypto?.randomUUID ? window.crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setIdempotencyKey(generated);
    }
  }, []);

  // Tự động điền email nếu người dùng đã đăng nhập
  useEffect(() => {
    if (session?.user?.email && !form.email) {
      setForm((prev) => ({
        ...prev,
        email: session.user?.email || "",
        fullName: session.user?.name || prev.fullName,
      }));
    }
  }, [session]);

  // Tính phí ship theo chính sách backend (Miễn phí từ 300.000 VND)
  const shippingFee = total >= 300000 || total === 0 ? 0 : 30000;
  const finalTotal = total + shippingFee;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      newErrors.fullName = "Vui lòng nhập họ và tên (ít nhất 2 ký tự)";
    }

    const cleanPhone = form.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
      newErrors.phone = "Số điện thoại phải từ 10 - 11 chữ số";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      newErrors.email = "Vui lòng nhập địa chỉ email hợp lệ";
    }

    if (!form.addressDetail.trim() || form.addressDetail.trim().length < 4) {
      newErrors.addressDetail = "Vui lòng nhập số nhà, tên ngõ/đường";
    }

    if (!form.province.trim()) {
      newErrors.province = "Vui lòng chọn Tỉnh / Thành phố";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (products.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống!");
      router.push("/cart");
      return;
    }

    if (!validate()) {
      toast.error("Vui lòng kiểm tra lại các trường thông tin nhận hàng");
      return;
    }

    setIsSubmitting(true);

    try {
      // Chuẩn bị payload chuẩn theo API Contract
      const orderPayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        province: form.province.trim(),
        district: form.district.trim(),
        ward: form.ward.trim(),
        addressDetail: form.addressDetail.trim(),
        orderNotice: form.orderNotice.trim(),
        paymentMethod: paymentMethod,
        items: products.map((item) => ({
          productId: item.productId,
          variantId: item.variantId !== "default" ? item.variantId : undefined,
          quantity: item.amount,
          customText: item.customText || undefined,
          customFont: item.customFont || undefined,
          customQrUrl: item.customQrUrl || undefined,
        })),
      };

      console.log(`Submitting ${paymentMethod} order with Idempotency Key:`, idempotencyKey);
      const result = await orderService.create(orderPayload, idempotencyKey);

      console.log("Order created successfully:", result);
      toast.success(`Đặt hàng thành công! Mã đơn: ${result.orderCode}`);

      // Xóa giỏ hàng sau khi backend xác nhận tạo đơn thành công
      clearCart();

      // Lưu email xác thực vào sessionStorage để trang xác nhận đọc mà không cần lộ trên URL (Audit 3)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_order_email", form.email.trim());
      }

      // Xử lý chuyển hướng nếu chọn thanh toán VietQR qua SePay
      if (paymentMethod === "SEPAY") {
        let session = result.checkoutSession;
        if (!session) {
          try {
            session = await paymentService.createSepayCheckoutSession(result.orderCode, form.email.trim(), form.phone.trim());
          } catch (sessionErr) {
            console.warn("Failed to get SePay checkout session, falling back to confirmation page:", sessionErr);
          }
        }

        if (session && session.checkoutUrl && session.fields) {
          toast.loading("Đang chuyển hướng sang Cổng thanh toán SePay...");
          submitSepayForm(session.checkoutUrl, session.fields);
          return;
        }
      }

      // Điều hướng sang trang xác nhận đơn hàng (COD hoặc SePay fallback)
      router.push(`/order-confirmation/${result.orderCode}`);
    } catch (err: any) {
      console.error("Order creation failed:", err);
      const errMsg = err.details || err.message || "Không thể tạo đơn hàng. Vui lòng thử lại.";
      setSubmitError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
      toast.error(typeof errMsg === "string" ? errMsg : "Đặt hàng thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-[#FAF9F6] min-h-[60vh] flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-white p-8 rounded-3xl border border-[#E7E5E4] max-w-md w-full text-center shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E2229] mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 mb-6 text-xs sm:text-sm">Bạn chưa có sản phẩm nào để tiến hành thanh toán.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white font-semibold text-xs sm:text-sm hover:bg-[#2D323C] transition-all"
          >
            <FaArrowLeft /> Mua sắm ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-8">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/cart" className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-[#E06D53] transition-colors">
            <FaArrowLeft /> Quay lại giỏ hàng
          </Link>
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <FaShieldHalved className="text-emerald-600" /> Thanh toán an toàn COD
          </span>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: FORM ĐỊA CHỈ & THÔNG TIN GIAO HÀNG (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E5E4] shadow-sm flex flex-col gap-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#1E2229]">Thông tin giao hàng</h2>
              <p className="text-xs text-gray-500 mt-1">
                Vui lòng điền thông tin chính xác để nhân viên giao hàng liên hệ phát hàng COD.
              </p>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
                <strong>Lỗi đặt hàng:</strong> {submitError}
              </div>
            )}

            {/* Họ tên & Số điện thoại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ và tên người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                    errors.fullName ? "border-rose-400 focus:ring-rose-400/20" : "border-gray-200 focus:border-[#E06D53] focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="VD: 0987654321"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
                    errors.phone ? "border-rose-400 focus:ring-rose-400/20" : "border-gray-200 focus:border-[#E06D53] focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email nhận xác nhận đơn hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="VD: an.nguyen@example.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 ${
                  errors.email ? "border-rose-400 focus:ring-rose-400" : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            {/* Tỉnh / Huyện / Xã */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tỉnh / Thành phố <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => handleInputChange("province", e.target.value)}
                  placeholder="Hà Nội, TP.HCM..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quận / Huyện</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => handleInputChange("district", e.target.value)}
                  placeholder="Cầu Giấy, Quận 1..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phường / Xã</label>
                <input
                  type="text"
                  value={form.ward}
                  onChange={(e) => handleInputChange("ward", e.target.value)}
                  placeholder="Dịch Vọng Hậu..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Địa chỉ chi tiết */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Địa chỉ chi tiết (Số nhà, tên ngõ/đường) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.addressDetail}
                onChange={(e) => handleInputChange("addressDetail", e.target.value)}
                placeholder="VD: Số 123 Đường Cầu Giấy, Tòa nhà ABC..."
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 ${
                  errors.addressDetail ? "border-rose-400 focus:ring-rose-400" : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              {errors.addressDetail && <p className="text-xs text-rose-500 mt-1">{errors.addressDetail}</p>}
            </div>

            {/* Ghi chú đơn hàng */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú cho xưởng / shipper (tùy chọn)</label>
              <textarea
                rows={2}
                value={form.orderNotice}
                onChange={(e) => handleInputChange("orderNotice", e.target.value)}
                placeholder="VD: Giao giờ hành chính, gọi trước khi giao, đóng hộp quà..."
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* PHƯƠNG THỨC THANH TOÁN (COD & SEPAY VIETQR) */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Phương thức thanh toán</h3>
              <p className="text-xs text-gray-500 mb-3">Vui lòng chọn hình thức thanh toán thuận tiện nhất cho bạn.</p>

              <div className="space-y-3">
                {/* Lựa chọn 1: COD */}
                <div
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === "COD"
                      ? "border-[#E06D53] bg-[#FDF2EE]/60 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        paymentMethod === "COD" ? "border-[#E06D53] bg-[#E06D53]" : "border-gray-300 bg-white"
                      }`}
                    >
                      {paymentMethod === "COD" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">Thanh toán khi nhận hàng (COD)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                          Phổ biến
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        Kiểm tra móc khóa / bảng tên in 3D trước khi thanh toán tiền mặt cho bưu tá.
                      </span>
                    </div>
                  </div>
                  <FaTruck className={`text-xl ${paymentMethod === "COD" ? "text-[#E06D53]" : "text-gray-400"}`} />
                </div>

                {/* Lựa chọn 2: VietQR qua Cổng SePay */}
                <div
                  onClick={() => setPaymentMethod("SEPAY")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === "SEPAY"
                      ? "border-blue-600 bg-blue-50/60 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        paymentMethod === "SEPAY" ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                      }`}
                    >
                      {paymentMethod === "SEPAY" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">Chuyển khoản VietQR (Cổng SePay Sandbox)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                          Tự động 24/7
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        Quét mã VietQR bằng mọi App ngân hàng / MoMo / ZaloPay. Xác nhận tức thì, xưởng ưu tiên sản xuất trước.
                      </span>
                    </div>
                  </div>
                  <FaQrcode className={`text-xl ${paymentMethod === "SEPAY" ? "text-blue-600" : "text-gray-400"}`} />
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & XÁC NHẬN (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">
                Đơn hàng của bạn ({products.length} loại sản phẩm)
              </h3>

              {/* Danh sách sản phẩm rút gọn */}
              <div className="divide-y max-h-72 overflow-y-auto pr-1">
                {products.map((item) => (
                  <div key={item.cartItemId || item.id} className="py-3 flex gap-3 text-xs">
                    <div className="w-14 h-14 rounded-lg bg-gray-50 border p-1 flex-shrink-0 flex items-center justify-center">
                      <Image
                        src={
                          item.image
                            ? item.image.startsWith("/")
                              ? item.image
                              : `/${item.image}`
                            : "/images/products/keychain-the-bai-front-back.jpg"
                        }
                        alt={item.title}
                        width={48}
                        height={48}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{sanitize(item.title)}</p>
                      <p className="text-gray-500 mt-0.5">
                        Kích thước: <strong>{item.sizeLabel || "Tiêu chuẩn"}</strong> x {item.amount}
                      </p>
                      {item.customText && (
                        <p className="text-blue-700 font-medium truncate mt-0.5 flex items-center gap-1">
                          <FaWandMagicSparkles className="text-[10px]" /> Khắc: &quot;{item.customText}&quot;
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-gray-900">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                          item.price * item.amount
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chi tiết tiền */}
              <div className="pt-4 border-t mt-4 space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Tạm tính hàng:</span>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span className="font-semibold text-gray-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">Miễn phí</span>
                    ) : (
                      new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(shippingFee)
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t flex justify-between items-baseline text-sm">
                  <span className="font-bold text-gray-900">
                    {paymentMethod === "SEPAY" ? "Tổng tiền thanh toán VietQR:" : "Tổng thanh toán khi nhận (COD):"}
                  </span>
                  <span className="text-xl font-extrabold text-[#E06D53]">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Nút Đặt hàng */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full mt-6 py-4 px-4 rounded-2xl font-bold text-sm text-white shadow-md transition-all uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                  paymentMethod === "SEPAY"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-[#E06D53] hover:bg-[#C85A42]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin text-base" /> Đang xử lý đơn hàng...
                  </>
                ) : paymentMethod === "SEPAY" ? (
                  <>
                    <FaQrcode className="text-base" /> Chuyển khoản VietQR qua SePay
                  </>
                ) : (
                  <>
                    <FaCheck /> Xác nhận đặt hàng (COD)
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                Bằng cách đặt hàng, bạn đồng ý với chính sách chế tác và đổi trả trong 7 ngày của xưởng.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
