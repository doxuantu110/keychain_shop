"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaWandMagicSparkles, FaCube, FaArrowRight, FaQrcode, FaCheck, FaPalette } from "react-icons/fa6";

const CustomizationHighlight = () => {
  const [previewText, setPreviewText] = useState("ANH TUẤN");
  const [selectedColor, setSelectedColor] = useState("Cam Pastel");
  const [selectedSize, setSelectedSize] = useState("6cm");

  const colors = [
    { name: "Cam Pastel", hex: "#E06D53" },
    { name: "Xanh Navy", hex: "#1E293B" },
    { name: "Trắng Kem", hex: "#F5F3EF" },
    { name: "Đen Nhám", hex: "#18181B" },
  ];

  const sizes = ["6cm", "8cm", "10cm"];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FAF9F6] to-[#FFFDF9] border-b border-[#E7E5E4] relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* CỘT TRÁI: GIỚI THIỆU KHẢ NĂNG CÁ NHÂN HÓA */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-4 shadow-sm">
              <FaWandMagicSparkles />
              <span>Tính Năng Độc Đáo Nhất</span>
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E2229] tracking-tight leading-tight">
              Tạo móc khóa mang dấu ấn của riêng bạn
            </h2>

            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              Không còn những chiếc móc khóa đại trà. Tại Craft3D, mỗi sản phẩm đều được in 3D và khắc tên chính xác theo thông tin bạn mong muốn.
            </p>

            {/* Quy trình 4 bước */}
            <div className="mt-8 space-y-4 w-full">
              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full bg-[#1E2229] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h4 className="text-sm font-bold text-[#1E2229]">Chọn mẫu phôi & kích thước</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Đa dạng kích thước tiêu chuẩn 6cm, 8cm, 10cm phù hợp balo, chìa khóa xe.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full bg-[#E06D53] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-bold text-[#1E2229]">Nhập tên & thông điệp khắc</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ tiếng Việt có dấu, chọn kiểu chữ thư pháp, hiện đại hoặc viết tay.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full bg-[#1E2229] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h4 className="text-sm font-bold text-[#1E2229]">Tích hợp mã QR thông minh</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Tùy chọn gắn mã QR dẫn đến trang cá nhân, số điện thoại khẩn cấp hoặc tin nhắn đặc biệt.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-full bg-[#E06D53] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <h4 className="text-sm font-bold text-[#1E2229]">Xem trước AR 3D & Nhận hàng</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Trải nghiệm xem 3D ngay trên điện thoại trước khi đặt hàng.</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link
                href="/product/moc-khoa-3d-the-bai"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#E06D53] text-white font-semibold text-sm hover:bg-[#C85A42] shadow-sm transition-all"
              >
                <span>Tùy biến Móc khóa 3D thẻ bài ngay</span>
                <FaArrowRight className="text-xs" />
              </Link>
            </div>
          </div>

          {/* CỘT PHẢI: TRẢI NGHIỆM THỬ TÙY BIẾN TƯƠNG TÁC */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E5E4] shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FaWandMagicSparkles className="text-[#E06D53]" />
                  <span className="text-sm font-bold text-[#1E2229]">Thử Nghiệm Cá Nhân Hóa</span>
                </div>
                <span className="text-[11px] text-gray-400">Xem trước trực tiếp</span>
              </div>

              {/* Khung visual mockup preview */}
              <div className="my-6 aspect-[16/10] rounded-2xl bg-gradient-to-br from-[#1E2229] to-[#2D323C] p-6 text-white flex flex-col justify-between relative shadow-inner overflow-hidden">
                <div className="flex justify-between items-start text-xs text-gray-300">
                  <span className="font-mono uppercase bg-white/10 px-2 py-0.5 rounded text-[10px]">
                    Size: {selectedSize}
                  </span>
                  <span className="flex items-center gap-1 text-[#E06D53]">
                    <FaCube /> In 3D Độc Bản
                  </span>
                </div>

                {/* Chữ mô phỏng được khắc nổi */}
                <div className="text-center my-auto">
                  <span className="text-[10px] text-gray-400 block tracking-widest uppercase mb-1">
                    Nội dung khắc nổi:
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-wider text-white drop-shadow-md">
                    {previewText || "TÊN CỦA BẠN"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Màu hoàn thiện: {selectedColor}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-white/10">
                  <span>Chế tác theo đơn đặt hàng</span>
                  <span className="text-emerald-400 font-medium">● Sẵn sàng in</span>
                </div>
              </div>

              {/* Điều khiển tương tác */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    1. Nhập tên bạn muốn khắc thử:
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value.toUpperCase())}
                    placeholder="VD: MINH KHANG"
                    className="w-full rounded-xl border border-gray-200 bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#1E2229] font-medium outline-none focus:border-[#E06D53] focus:bg-white focus:ring-2 focus:ring-[#E06D53]/20 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    2. Chọn kích thước móc khóa:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          selectedSize === s
                            ? "bg-[#1E2229] text-white border-[#1E2229] shadow-sm"
                            : "bg-[#FAF9F6] text-gray-700 border-gray-200 hover:bg-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    3. Chọn tông màu hoàn thiện:
                  </label>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                          selectedColor === c.name
                            ? "border-[#E06D53] bg-[#FDF2EE] text-[#E06D53] font-bold"
                            : "border-gray-200 bg-[#FAF9F6] text-gray-600 hover:bg-white"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-gray-300"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomizationHighlight;
