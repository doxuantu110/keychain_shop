"use client";

import { CustomButton, SectionTitle } from "@/components";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    const expired = searchParams.get("expired");
    if (expired === "true") {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (sessionStatus === "authenticated") {
      router.replace("/");
    }
  }, [sessionStatus, router, searchParams]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

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

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email hoặc mật khẩu không chính xác");
      toast.error("Email hoặc mật khẩu không chính xác");
      if (res?.url) router.replace("/");
    } else {
      setError("");
      toast.success("Đăng nhập thành công!");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#E06D53] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              Đăng nhập để theo dõi đơn hàng và lưu sản phẩm yêu thích
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all"
              />
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
                text="Đăng nhập"
                customWidth="full"
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
                onClick={() => signIn("google")}
              >
                <FcGoogle className="text-lg" />
                <span>Google</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 text-center text-xs text-gray-500">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-[#E06D53] hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;