"use client";

import { CustomButton, SectionTitle } from "@/components";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { getSafeReturnUrl, isValidVietnamesePhone } from "@/lib/utils";
import { FaCheck, FaXmark, FaEye, FaEyeSlash } from "react-icons/fa6";

const RegisterPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();

  const returnUrlParam = searchParams.get("returnUrl") || searchParams.get("callbackUrl");
  const safeReturnUrl = useMemo(() => getSafeReturnUrl(returnUrlParam, "/"), [returnUrlParam]);

  // Form states
  const [form, setForm] = useState({
    lastname: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace(safeReturnUrl);
    }
  }, [sessionStatus, router, safeReturnUrl]);

  // Password criteria checks
  const passwordCriteria = useMemo(() => {
    const pwd = form.password;
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[@$!%*?&]/.test(pwd),
      passwordsMatch: form.confirmPassword.length > 0 && form.password === form.confirmPassword,
    };
  }, [form.password, form.confirmPassword]);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) setGeneralError("");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.lastname.trim() || form.lastname.trim().length < 2) {
      newErrors.lastname = "Vui lòng nhập họ và tên đệm (tối thiểu 2 ký tự)";
    }

    if (!form.name.trim() || form.name.trim().length < 2) {
      newErrors.name = "Vui lòng nhập tên của bạn (tối thiểu 2 ký tự)";
    }

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      newErrors.email = "Địa chỉ email không đúng định dạng (VD: example@gmail.com)";
    }

    if (!form.phone.trim() || !isValidVietnamesePhone(form.phone.trim())) {
      newErrors.phone = "Số điện thoại Việt Nam không hợp lệ (VD: 0912345678)";
    }

    const { minLength, hasUpper, hasLower, hasNumber, hasSpecial } = passwordCriteria;
    if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      newErrors.password = "Mật khẩu chưa đáp ứng đầy đủ các tiêu chuẩn bảo mật bên dưới";
    }

    if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Vui lòng hoàn thiện đúng các trường thông tin bên dưới");
      return;
    }

    try {
      setLoading(true);
      setGeneralError("");

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: form.address.trim() || null,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
        const loginUrl = safeReturnUrl !== "/"
          ? `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`
          : "/login";
        router.push(loginUrl);
      } else {
        if (data.details && Array.isArray(data.details)) {
          const errorMessage = data.details.map((err: any) => err.message).join(", ");
          setGeneralError(errorMessage);
          toast.error(errorMessage);
        } else if (data.error) {
          setGeneralError(data.error);
          toast.error(data.error);
        } else {
          setGeneralError("Đăng ký không thành công. Vui lòng thử lại.");
          toast.error("Đăng ký không thành công. Vui lòng thử lại.");
        }
      }
    } catch (err) {
      setGeneralError("Đã xảy ra lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      toast.error("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#E06D53] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const loginLink = safeReturnUrl !== "/"
    ? `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`
    : "/login";

  return (
    <div className="bg-[#FAF9F6] min-h-screen pb-16">
      <SectionTitle title="Đăng Ký Tài Khoản" path="Trang chủ / Đăng ký" />

      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="bg-white px-6 py-10 shadow-sm border border-[#E7E5E4] rounded-3xl sm:px-10">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E2229]">
              Tạo tài khoản khách hàng Craft3D
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Đăng ký để lưu thông tin đặt hàng, theo dõi đơn và thanh toán nhanh chóng
            </p>
          </div>

          {generalError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-700">
              <strong>Lỗi:</strong> {generalError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Họ đệm & Tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="lastname"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Họ và tên đệm <span className="text-rose-500">*</span>
                </label>
                <input
                  id="lastname"
                  type="text"
                  required
                  value={form.lastname}
                  onChange={(e) => handleInputChange("lastname", e.target.value)}
                  placeholder="VD: Nguyễn Văn"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.lastname
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.lastname && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.lastname}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="VD: An"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.name
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Email & Số điện thoại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="VD: email@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.email
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={form.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="VD: 0912345678"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.phone
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Địa chỉ mặc định (Tùy chọn) */}
            <div>
              <label
                htmlFor="address"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Địa chỉ giao hàng mặc định <span className="text-gray-400 font-normal">(Tùy chọn)</span>
              </label>
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Số nhà, tên ngõ/đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Địa chỉ này sẽ được tự động điền khi bạn tiến hành thanh toán
              </p>
            </div>

            {/* Mật khẩu */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt"
                  className={`w-full pr-10 px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.password
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-rose-600">{errors.password}</p>
              )}

              {/* Password strength checklist */}
              <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                <span className="font-semibold text-gray-600 block mb-1">Yêu cầu bảo mật mật khẩu:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                    {passwordCriteria.minLength ? <FaCheck className="text-emerald-600" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                    <span>Ít nhất 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                    {passwordCriteria.hasUpper && passwordCriteria.hasLower ? <FaCheck className="text-emerald-600" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                    <span>Chữ hoa (A-Z) & chữ thường (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                    {passwordCriteria.hasNumber ? <FaCheck className="text-emerald-600" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                    <span>Ít nhất 1 chữ số (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
                    {passwordCriteria.hasSpecial ? <FaCheck className="text-emerald-600" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                    <span>Ký tự đặc biệt (@$!%*?&)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Xác nhận mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Nhập lại mật khẩu vừa nhập"
                  className={`w-full pr-10 px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition-all ${
                    errors.confirmPassword
                      ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600">{errors.confirmPassword}</p>
              )}
              {form.confirmPassword.length > 0 && (
                <p className={`mt-1 text-[11px] flex items-center gap-1 ${passwordCriteria.passwordsMatch ? "text-emerald-600" : "text-rose-600"}`}>
                  {passwordCriteria.passwordsMatch ? (
                    <>
                      <FaCheck /> Mật khẩu xác nhận đã khớp
                    </>
                  ) : (
                    <>
                      <FaXmark /> Mật khẩu xác nhận chưa khớp
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="pt-3">
              <CustomButton
                buttonType="submit"
                text={loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
                customWidth="full"
                disabled={loading}
              />
            </div>
          </form>

          <div className="mt-8 pt-5 border-t border-gray-100 text-center text-xs text-gray-500">
            Đã có tài khoản?{" "}
            <Link href={loginLink} className="font-bold text-[#E06D53] hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
