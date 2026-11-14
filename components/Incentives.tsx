"use client";

import React from "react";
import { FaTruckFast, FaShieldHalved, FaRotateLeft, FaCube } from "react-icons/fa6";

const Incentives = () => {
  const items = [
    {
      icon: <FaTruckFast className="text-2xl text-[#E06D53]" />,
      name: "Miễn Phí Vận Chuyển",
      description: "Tự động miễn phí giao hàng toàn quốc cho mọi đơn hàng có giá trị từ 300.000 ₫.",
    },
    {
      icon: <FaShieldHalved className="text-2xl text-[#E06D53]" />,
      name: "Thanh Toán COD An Tâm",
      description: "Khách hàng được quyền kiểm tra hàng, kiểm tra tên khắc trước khi thanh toán cho shipper.",
    },
    {
      icon: <FaRotateLeft className="text-2xl text-[#E06D53]" />,
      name: "Bảo Hành Đổi Trả 7 Ngày",
      description: "Cam kết 1 đổi 1 nhanh chóng và miễn phí nếu sản phẩm có lỗi in hoặc sai lệch thông tin khắc.",
    },
    {
      icon: <FaCube className="text-2xl text-[#E06D53]" />,
      name: "Trải Nghiệm Xem AR 3D",
      description: "Xem mô hình móc khóa trực tiếp trong không gian thực qua điện thoại trước khi đưa vào sản xuất.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-b border-[#E7E5E4]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E06D53] bg-[#FDF2EE] px-3 py-1 rounded-full inline-block mb-2">
            Quyền Lợi Khách Hàng
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] tracking-tight">
            Cam Kết Chất Lượng & Dịch Vụ
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E7E5E4] hover:shadow-md transition-all flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <h3 className="font-bold text-base text-[#1E2229] mb-1.5">
                {item.name}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Incentives;