"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaCube, FaMagnifyingGlassPlus, FaXmark, FaRotate, FaShieldHalved } from "react-icons/fa6";

interface ProductGalleryProps {
  mainImage: string;
  images: Array<{ imageID?: string; image: string }>;
  title: string;
  arEnabled?: boolean;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({
  mainImage,
  images = [],
  title,
  arEnabled = true,
}) => {
  // Tập hợp danh sách ảnh đầy đủ (tối thiểu 3 ảnh)
  const allImages = [
    {
      src: mainImage ? (mainImage.startsWith("/") ? mainImage : `/${mainImage}`) : "/images/products/keychain-the-bai-front-back.jpg",
      label: "Tổng thể 2 mặt",
      caption: "Mặt trước hoa văn & mặt sau trơn phẳng sẵn sàng khắc tên",
    },
    ...images.map((item, idx) => {
      const src = item.image.startsWith("/") ? item.image : `/${item.image}`;
      let label = `Ảnh ${idx + 2}`;
      let caption = "Chi tiết sản phẩm in 3D";
      if (src.includes("detail")) {
        label = "Chi tiết in 3D";
        caption = "Cận cảnh độ sắc nét của lớp in 0.16mm và biểu tượng mặt trước";
      } else if (src.includes("render")) {
        label = "Bản vẽ 3D CAD";
        caption = "Thiết kế kỹ thuật số ba góc độ: mặt trước, mặt sau và cạnh bên";
      }
      return { src, label, caption };
    }),
  ];

  // Loại bỏ ảnh trùng lặp nếu có
  const uniqueImages = allImages.filter(
    (item, index, self) => index === self.findIndex((t) => t.src === item.src)
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isArModalOpen, setIsArModalOpen] = useState(false);

  const currentImage = uniqueImages[activeIndex] || uniqueImages[0];

  return (
    <div className="flex flex-col w-full">
      {/* KHUNG HIỂN THỊ ẢNH CHÍNH (Object-contain, bảo toàn tỷ lệ, không crop móc hay đầu nhọn) */}
      <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-3xl bg-[#FAF9F6] border border-[#E7E5E4] overflow-hidden flex items-center justify-center p-4 sm:p-8 group shadow-inner">
        <Image
          src={currentImage.src}
          alt={`${title} - ${currentImage.label}`}
          width={650}
          height={800}
          priority
          className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Nút phóng to / Zoom */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 text-[#1E2229] hover:bg-[#1E2229] hover:text-white flex items-center justify-center text-xs shadow-sm transition-all"
          title="Phóng to xem chi tiết"
          aria-label="Phóng to ảnh"
        >
          <FaMagnifyingGlassPlus />
        </button>

        {/* Nút Trải nghiệm AR 3D */}
        {arEnabled && (
          <button
            type="button"
            onClick={() => setIsArModalOpen(true)}
            className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E2229]/90 backdrop-blur-sm text-white text-xs font-semibold hover:bg-[#E06D53] shadow-md transition-all cursor-pointer"
          >
            <FaCube className="text-[#E06D53] text-[11px]" />
            <span>Trải nghiệm 3D / AR</span>
          </button>
        )}

        {/* Chú thích ảnh phía dưới */}
        <div className="absolute bottom-3 inset-x-4 text-center pointer-events-none">
          <span className="inline-block bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full shadow-xs">
            {currentImage.caption}
          </span>
        </div>
      </div>

      {/* THUMBNAIL STRIP (Chuyển đổi 3 ảnh mượt mà) */}
      {uniqueImages.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {uniqueImages.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl p-1.5 border-2 transition-all overflow-hidden flex flex-col items-center justify-between ${
                  isActive
                    ? "border-[#E06D53] bg-white shadow-md scale-105"
                    : "border-gray-200 bg-[#FAF9F6] opacity-75 hover:opacity-100 hover:border-gray-300"
                }`}
                aria-label={img.label}
              >
                <div className="relative w-full h-16 sm:h-20 flex items-center justify-center">
                  <Image
                    src={img.src}
                    alt={img.label}
                    fill
                    sizes="(max-width: 768px) 80px, 96px"
                    className="object-contain p-1"
                  />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center pb-0.5">
                  {img.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX MODAL (Xem ảnh độ phân giải cao phóng to) */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#E06D53] text-2xl p-2 transition-colors"
              aria-label="Đóng"
            >
              <FaXmark />
            </button>

            {/* Ảnh phóng to */}
            <div className="relative w-full h-[70vh] flex items-center justify-center">
              <Image
                src={currentImage.src}
                alt={currentImage.label}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Thông tin ảnh trong Lightbox */}
            <div className="mt-4 text-center text-white">
              <h4 className="text-base font-bold">{currentImage.label}</h4>
              <p className="text-xs text-gray-300 mt-1">{currentImage.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* AR / 3D PREVIEW MODAL (Văn minh, trung thực theo Spec) */}
      {isArModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100">
            <button
              type="button"
              onClick={() => setIsArModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black text-xl transition-colors"
              aria-label="Đóng"
            >
              <FaXmark />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-12 h-12 rounded-2xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-xl shadow-xs">
                <FaCube />
              </span>
              <div>
                <h3 className="font-extrabold text-lg text-[#1E2229]">
                  Trải Nghiệm 3D / AR Thực Tế
                </h3>
                <span className="text-xs text-gray-500">Móc khóa 3D thẻ bài</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed bg-[#FAF9F6] p-4 rounded-2xl border border-gray-200">
              <p>
                <strong className="text-[#1E2229]">Bản vẽ CAD 3D:</strong> Bạn có thể kiểm tra trực tiếp ba góc độ (mặt trước, mặt sau và mặt bên) của móc khóa thẻ bài tại thẻ ảnh số 3 trong bộ sưu tập.
              </p>
              <p>
                <strong className="text-[#1E2229]">Hỗ trợ WebXR & Quick Look:</strong> Hệ thống đã sẵn sàng cổng tích hợp asset 3D định dạng <code>.glb</code> (cho Android Scene Viewer) và <code>.usdz</code> (cho iOS AR Quick Look).
              </p>
              <p className="text-gray-500 italic">
                * File mô hình 3D tương tác không gian thực đang trong quá trình xuất tối ưu hóa polygon từ xưởng thiết kế.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsArModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1E2229] text-white text-xs font-semibold hover:bg-[#E06D53] transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;

