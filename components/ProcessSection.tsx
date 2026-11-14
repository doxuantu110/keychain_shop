"use client";

import React from "react";
import {
  FaWandMagicSparkles,
  FaLayerGroup,
  FaCube,
  FaShieldHalved,
  FaArrowRight,
} from "react-icons/fa6";
import Link from "next/link";

const ProcessSection = () => {
  const steps = [
    {
      step: "01",
      icon: <FaWandMagicSparkles className="text-2xl text-[#E06D53]" />,
      title: "Thiết Kế Số Hóa 3D",
      desc: "Hệ thống tự động tham số hóa tên riêng, chữ khắc hoặc thông tin của bạn thành mô hình CAD 3D chuẩn xác từng đường nét.",
      badge: "Parametric Design",
    },
    {
      step: "02",
      icon: <FaLayerGroup className="text-2xl text-[#E06D53]" />,
      title: "Cắt Lớp Siêu Mịn 0.16mm",
      desc: "Tối ưu hóa đường chạy đầu in với mật độ infill 100%, đảm bảo móc khóa cứng cáp, chịu lực va đập và bề mặt mịn màng.",
      badge: "Precision Slicing",
    },
    {
      step: "03",
      icon: <FaCube className="text-2xl text-[#E06D53]" />,
      title: "In 3D FDM Đa Sắc Màu",
      desc: "Đùn lớp vật liệu nhựa sinh học PLA/PETG nguyên sinh nhập khẩu, tái hiện chuẩn xác màu sắc và độ sắc nét theo thiết kế.",
      badge: "Eco Bioplastic",
    },
    {
      step: "04",
      icon: <FaShieldHalved className="text-2xl text-[#E06D53]" />,
      title: "Hoàn Thiện Thủ Công",
      desc: "Xử lý ba via tỉ mỉ bằng tay, lắp khoen móc kim loại chống gỉ và kiểm tra từng chi tiết trước khi đóng hộp trao tay bạn.",
      badge: "Hand-finished",
    },
  ];

  return (
    <section id="process" className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-[#E7E5E4] scroll-mt-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header section */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3.5 py-1.5 rounded-full inline-block mb-3">
            Nghệ Thuật Chế Tác
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2229] tracking-tight">
            Quy Trình Sản Xuất Bằng Công Nghệ In 3D
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Mỗi chiếc móc khóa tại Craft3D không phải sản phẩm dập khuôn đại trà, mà là một tác phẩm được tạo mẫu số hóa và hoàn thiện tỉ mỉ cho riêng bạn.
          </p>
        </div>

        {/* Lưới 4 bước */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative bg-white rounded-2xl p-6 sm:p-7 border border-[#E7E5E4] shadow-sm hover:shadow-md hover:border-[#E06D53]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Bước số & Tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-[#E06D53]/40 group-hover:text-[#E06D53] transition-colors">
                    {item.step}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 bg-[#FAF9F6] border border-gray-200 px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] flex items-center justify-center border border-gray-100 mb-4 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>

                {/* Tiêu đề & mô tả */}
                <h3 className="text-base font-bold text-[#1E2229] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Đường kẻ chân */}
              <div className="mt-6 pt-3 border-t border-gray-100 flex items-center text-xs text-[#E06D53] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Xem chi tiết</span>
                <FaArrowRight className="ml-1 text-[10px]" />
              </div>
            </div>
          ))}
        </div>

        {/* Banner cam kết công nghệ dưới các bước */}
        <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E5E4] max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="text-center sm:text-left">
            <h4 className="text-base font-bold text-[#1E2229]">
              Cam kết chất liệu nhựa sinh học an toàn
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Nhựa PLA có nguồn gốc từ bột ngô và mía đường, không độc hại, không mùi khó chịu và thân thiện với môi trường.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#E06D53] transition-colors shadow-sm flex-shrink-0"
          >
            <span>Tạo mẫu ngay</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;

