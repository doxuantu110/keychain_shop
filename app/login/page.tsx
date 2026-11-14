"use client";

import { CustomButton, SectionTitle } from "@/components";
import { isValidEmailAddressFormat, getSafeReturnUrl } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import Link from "next/link";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { status: sessionStatus } = useSession();

  const returnUrlParam = searchParams.get("returnUrl") || searchParams.get("callbackUrl");
  const safeReturnUrl = useMemo(() => getSafeReturnUrl(returnUrlParam, "/"), [returnUrlParam]);

  useEffect(() => {
    const expired = searchParams.get("expired");
    if (expired === "true") {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (sessionStatus === "authenticated") {
      router.replace(safeReturnUrl);
    }
  }, [sessionStatus, router, searchParams, safeReturnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmailAddressFormat(email)) {
      setError("Địa chỉ email không hợp lệ");
      toast.error("Địa chỉ email không hợp lệ");
      return;
    }

    if (!password || password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.error) {
        setError("Email hoặc mật khẩu không chính xác");
        toast.error("Email hoặc mật khẩu không chính xác");
      } else {
        setError("");
        toast.success("Đăng nhập thành công!");
        router.replace(safeReturnUrl);
        router.refresh();
      }
    } catch (err) {
      setError("Đã xảy ra lỗi đăng nhập. Vui lòng thử lại.");
      toast.error("Đã xảy ra lỗi đăng nhập");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#E06D53] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const registerLink = safeReturnUrl !== "/"
    ? `/register?returnUrl=${encodeURIComponent(safeReturnUrl)}`
    : "/register";

  return (
    <div className="bg-[#FAF9F6] min-h-screen pb-16">
      <SectionTitle title="Đăng Nhập" path="Trang chủ / Đăng nhập" />

      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white px-6 py-10 shadow-sm border border-[#E7E5E4] rounded-3xl sm:px-10">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E2229]">
              Chào mừng bạn trở lại
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Đăng nhập để tiếp tục thanh toán và theo dõi đơn hàng của bạn
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: email@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <a href="#" className="text-xs text-[#E06D53] hover:underline">
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                  className="w-full pr-10 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all"
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
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#1E2229] focus:ring-[#E06D53]"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-xs text-gray-600 cursor-pointer"
              >
                Ghi nhớ đăng nhập
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 text-center">
                {error}
              </div>
            )}

            <div>
              <CustomButton
                buttonType="submit"
                text={isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
                customWidth="full"
                disabled={isSubmitting}
              />
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-gray-400">
                  Hoặc đăng nhập nhanh bằng
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
                onClick={() => signIn("google", { callbackUrl: safeReturnUrl })}
              >
                <FcGoogle className="text-lg" />
                <span>Google</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 text-center text-xs text-gray-500">
            Chưa có tài khoản?{" "}
            <Link href={registerLink} className="font-bold text-[#E06D53] hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
