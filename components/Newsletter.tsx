"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaPaperPlane } from "react-icons/fa6";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success("Cảm ơn bạn đã đăng ký nhận tin từ Craft3D!");
      setEmail("");
    }
  };

  return (
    <section className="bg-[#FAF9F6] py-16 sm:py-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="bg-[#1E2229] rounded-3xl p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-xl">
          {/* Họa tiết trang trí */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#E06D53]/10 blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-white/10 px-3 py-1 rounded-full inline-block mb-3">
                Bản Tin Thiết Kế
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Nhận Ý Tưởng Thiết Kế & Ưu Đãi Mới Nhất
              </h2>
              <p className="mt-2 text-sm sm:text-base text-gray-300 max-w-xl leading-relaxed">
                Đăng ký email để cập nhật các mẫu móc khóa in 3D mới nhất, mẹo cá nhân hóa độc đáo và mã voucher ưu đãi sớm nhất từ xưởng Craft3D.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="lg:col-span-5 w-full">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của bạn..."
                  className="min-w-0 flex-auto rounded-xl border border-gray-700 bg-[#2D323C] px-4 py-3 text-sm text-white placeholder-gray-400 outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E06D53] px-6 py-3 text-sm font-semibold text-white hover:bg-[#C85A42] transition-colors shadow-sm flex-shrink-0"
                >
                  <span>Đăng ký</span>
                  <FaPaperPlane className="text-xs" />
                </button>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Craft3D cam kết bảo mật thông tin và không gửi thư rác.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;