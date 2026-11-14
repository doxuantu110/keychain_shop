"use client";

import Link from "next/link";
import React from "react";
import { FaCube, FaWandMagicSparkles, FaGem, FaGift, FaArrowRight, FaHeart } from "react-icons/fa6";

const IntroducingSection = () => {
  const values = [
    {
      icon: <FaCube className="text-2xl text-[#E06D53]" />,
      title: "Chế Tác In 3D Sắc Nét",
      desc: "Ứng dụng máy in 3D công nghệ FDM độ phân giải cao với từng lớp in 0.16mm mịn màng, góc cạnh chuẩn xác và độ bền vượt trội.",
    },
    {
      icon: <FaWandMagicSparkles className="text-2xl text-[#E06D53]" />,
      title: "Cá Nhân Hóa Độc Bản",
      desc: "Tự do khắc tên, biệt danh, số điện thoại hoặc mã QR cá nhân. Mỗi sản phẩm là độc nhất vô nhị, được làm riêng cho bạn.",
    },
    {
      icon: <FaGem className="text-2xl text-[#E06D53]" />,
      title: "Chất Liệu Sinh Học Tuyển Chọn",
      desc: "Sử dụng nhựa nguyên sinh sinh học PLA chiết xuất từ thực vật, thân thiện môi trường, an toàn và không mùi độc hại.",
    },
    {
      icon: <FaGift className="text-2xl text-[#E06D53]" />,
      title: "Món Quà Kỷ Niệm Ý Nghĩa",
      desc: "Lựa chọn hoàn hảo để làm quà tặng người thương, bạn bè, thú cưng hoặc phụ kiện gắn balo, túi xách tạo phong cách riêng.",
    },
  ];

  return (
    <section id="about" className="py-16 sm:py-24 bg-white border-b border-[#E7E5E4] scroll-mt-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Câu chuyện thương hiệu (Brand Story) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3.5 py-1.5 rounded-full inline-block mb-3">
              Câu Chuyện Thương Hiệu
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2229] tracking-tight leading-snug">
              Không sản xuất đại trà. <br />
              Tập trung vào sự <span className="text-[#E06D53]">độc bản</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              Craft3D khởi nguồn từ niềm đam mê với công nghệ tạo mẫu 3D và nghệ thuật thủ công. Chúng tôi tin rằng mỗi vật dụng nhỏ bé gắn bó hàng ngày — như chiếc móc chìa khóa hay thẻ tên balo — xứng đáng mang một câu chuyện và cảm xúc riêng biệt của người sở hữu.
            </p>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Thay vì sản xuất hàng loạt bằng khuôn nhựa công nghiệp nghìn cái như một, Craft3D chọn mô hình xưởng chế tác thủ công số hóa (Boutique 3D Studio). Chúng tôi chỉ khởi động máy in khi có thông tin cá nhân hóa từ bạn, chăm chút từng lớp nhựa và hoàn thiện bề mặt cẩn trọng trước khi giao hàng.
            </p>
          </div>

          <div className="lg:col-span-6 bg-[#FAF9F6] rounded-3xl p-8 border border-[#E7E5E4] flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <span className="w-10 h-10 rounded-xl bg-[#1E2229] text-[#E06D53] flex items-center justify-center text-lg">
                <FaHeart />
              </span>
              <div>
                <h4 className="font-bold text-[#1E2229] text-base">Triết Lý Chế Tác Craft3D</h4>
                <p className="text-xs text-gray-500">Mỗi chi tiết đều mang ý nghĩa</p>
              </div>
            </div>

            <div className="my-6 space-y-3.5 text-xs sm:text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E06D53]/10 text-[#E06D53] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">✓</span>
                <p><strong className="text-[#1E2229]">Độ chính xác cao:</strong> Thiết kế kỹ thuật số tham số hóa đảm bảo nét chữ sắc sảo, không nhòe mờ theo thời gian.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E06D53]/10 text-[#E06D53] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">✓</span>
                <p><strong className="text-[#1E2229]">Tôn trọng môi trường:</strong> Chỉ dùng hạt nhựa nhiệt dẻo sinh học tái sinh (PLA), hạn chế tối đa rác thải nhựa công nghiệp.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#E06D53]/10 text-[#E06D53] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">✓</span>
                <p><strong className="text-[#1E2229]">Kiểm tra thủ công 100%:</strong> Loại bỏ ba via, kiểm tra khớp nối và lắp khoen thép không gỉ trước khi đóng gói.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>Xưởng chế tác tại Việt Nam</span>
              <span className="font-semibold text-[#E06D53]">Hand-crafted with 3D Tech</span>
            </div>
          </div>
        </div>

        {/* 4 giá trị cốt lõi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E7E5E4] hover:border-[#E06D53]/40 hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 mb-4 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-[#1E2229] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntroducingSection;
