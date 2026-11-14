"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import { Product, ProductVariant } from "@/types/product";
import { formatVND } from "@/types/cart";
import { FaCheck, FaClock, FaXmark, FaPlus, FaMinus, FaWandMagicSparkles, FaQrcode } from "react-icons/fa6";

const FONT_OPTIONS = [
  { id: "Playfair Display", name: "Thư pháp / Serif Cổ điển (Playfair)", cssClass: "font-serif" },
  { id: "Inter", name: "Hiện đại / Rõ nét (Inter)", cssClass: "font-sans" },
  { id: "Montserrat", name: "Tối giản / Trẻ trung (Montserrat)", cssClass: "font-sans tracking-wide" },
  { id: "Oswald", name: "In hoa / Nam tính (Oswald)", cssClass: "font-mono uppercase" },
  { id: "Dancing Script", name: "Chữ viết tay mềm mại (Dancing Script)", cssClass: "italic font-serif" },
];

interface Props {
  product: Product;
}

const SingleProductDynamicFields: React.FC<Props> = ({ product }) => {
  const router = useRouter();
  const { addToCart, calculateTotals } = useProductStore();

  const activeVariants = useMemo(() => {
    return (product.variants || []).filter((v) => v.isActive);
  }, [product.variants]);

  const initialVariant = useMemo(() => {
    if (activeVariants.length === 0) return null;
    const inStockVar = activeVariants.find((v) => v.stock > 0 || v.allowPreorder);
    return inStockVar || activeVariants[0];
  }, [activeVariants]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(initialVariant);
  const [quantityCount, setQuantityCount] = useState<number>(1);
  const [customText, setCustomText] = useState<string>("");
  const [customFont, setCustomFont] = useState<string>("Playfair Display");
  const [customQrUrl, setCustomQrUrl] = useState<string>("");
  const [showQrInput, setShowQrInput] = useState<boolean>(false);

  const isAvailable = useMemo(() => {
    if (!selectedVariant) return Boolean(product.inStock);
    return selectedVariant.allowPreorder || selectedVariant.stock > 0;
  }, [selectedVariant, product.inStock]);

  const isPreorder = useMemo(() => {
    if (!selectedVariant) return false;
    return selectedVariant.allowPreorder && selectedVariant.stock <= 0;
  }, [selectedVariant]);

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : (product.inStock ? 99 : 0);

  const maxLen = product.maxCustomTextLength || 30;
  const isTextTooLong = customText.trim().length > maxLen;

  const handleQuantityChange = (type: "plus" | "minus") => {
    if (type === "plus") {
      if (!selectedVariant?.allowPreorder && quantityCount >= currentStock) {
        toast.error(`Kho chỉ còn ${currentStock} sản phẩm`);
        return;
      }
      setQuantityCount((prev) => prev + 1);
    } else if (type === "minus" && quantityCount > 1) {
      setQuantityCount((prev) => prev - 1);
    }
  };

  const handleAddToCart = (isBuyNow: boolean = false) => {
    if (!isAvailable) {
      toast.error("Biến thể này hiện đã hết hàng");
      return;
    }

    if (isTextTooLong) {
      toast.error(`Nội dung khắc không được vượt quá ${maxLen} ký tự`);
      return;
    }

    addToCart({
      productId: product.id,
      variantId: selectedVariant ? selectedVariant.id : "default",
      productTitle: product.title,
      productSlug: product.slug,
      image: product.mainImage,
      sizeLabel: selectedVariant ? selectedVariant.sizeLabel : undefined,
      color: selectedVariant ? selectedVariant.color : undefined,
      material: selectedVariant ? selectedVariant.material : undefined,
      price: currentPrice,
      amount: quantityCount,
      stock: currentStock,
      allowPreorder: selectedVariant ? selectedVariant.allowPreorder : false,
      customText: product.isCustomizable && customText.trim() ? customText.trim() : null,
      customFont: product.isCustomizable && customText.trim() ? customFont : null,
      customQrUrl: product.isCustomizable && customQrUrl.trim() ? customQrUrl.trim() : null,
    });

    calculateTotals();

    if (isBuyNow) {
      router.push("/checkout");
    } else {
      toast.success("Đã thêm sản phẩm vào giỏ hàng!");
    }
  };

  const selectedFontObj = FONT_OPTIONS.find((f) => f.id === customFont) || FONT_OPTIONS[0];

  return (
    <div className="flex flex-col gap-y-6">
      {/* 1. HIỂN THỊ GIÁ BÁN THỰC TẾ & TỒN KHO CỦA BIẾN THỂ */}
      <div className="flex flex-wrap items-baseline gap-x-4 border-b border-gray-200/80 pb-4">
        <span className="text-3xl font-extrabold text-[#1E2229]">
          {formatVND(currentPrice)}
        </span>
        {activeVariants.length > 0 && selectedVariant && (
          <span className="text-xs sm:text-sm text-gray-500 font-medium">
            (Biến thể: <strong className="text-[#1E2229]">{selectedVariant.sizeLabel}</strong>)
          </span>
        )}
      </div>

      {/* Trạng thái kho hàng */}
      <div className="text-xs sm:text-sm flex items-center gap-x-2">
        <span className="font-semibold text-gray-700">Tình trạng:</span>
        {isPreorder ? (
          <span className="inline-flex items-center gap-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <FaClock className="text-amber-600 text-xs" /> Nhận chế tác theo đơn (Đặt trước)
          </span>
        ) : isAvailable ? (
          <span className="inline-flex items-center gap-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <FaCheck className="text-emerald-600 text-xs" /> Sẵn sàng giao (Kho: {currentStock})
          </span>
        ) : (
          <span className="inline-flex items-center gap-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <FaXmark className="text-rose-600 text-xs" /> Tạm hết hàng
          </span>
        )}
      </div>

      {/* 2. CHỌN BIẾN THỂ / KÍCH THƯỚC */}
      {activeVariants.length > 0 && (
        <div className="flex flex-col gap-y-2.5">
          <label className="text-xs sm:text-sm font-bold text-[#1E2229]">
            Chọn kích thước / phiên bản:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeVariants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isVarOutOfStock = !variant.allowPreorder && variant.stock <= 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariant(variant);
                    setQuantityCount(1);
                  }}
                  className={`relative flex flex-col p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-[#E06D53] bg-[#FDF2EE] ring-2 ring-[#E06D53]/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  } ${isVarOutOfStock ? "opacity-60 bg-gray-50" : ""}`}
                >
                  <span className="font-bold text-sm text-[#1E2229]">
                    {variant.sizeLabel}
                  </span>
                  <span className="text-xs text-[#E06D53] font-extrabold mt-1">
                    {formatVND(variant.price)}
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5">
                    {variant.allowPreorder && variant.stock <= 0
                      ? "Đặt trước"
                      : variant.stock > 0
                      ? `Còn ${variant.stock}`
                      : "Hết hàng"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TÙY BIẾN KHẮC TÊN & FONT CHỮ (PERSONALIZATION) */}
      {product.isCustomizable && (
        <div className="p-5 rounded-2xl border border-[#E7E5E4] bg-[#FAF9F6] flex flex-col gap-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#1E2229] flex items-center gap-x-2 text-sm">
              <FaWandMagicSparkles className="text-[#E06D53]" />
              Tùy biến nội dung khắc tên & font chữ
            </h3>
            <span className="text-[11px] font-semibold text-[#E06D53] bg-[#FDF2EE] px-2.5 py-0.5 rounded-full border border-[#E06D53]/20">
              Miễn phí khắc
            </span>
          </div>

          {/* Ô nhập chữ khắc */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1.5 font-medium">
              <span>Nội dung khắc (tên, chữ ký, thông điệp):</span>
              <span className={isTextTooLong ? "text-rose-600 font-bold" : "text-gray-400"}>
                {customText.length} / {maxLen} ký tự
              </span>
            </div>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="VD: HUY & LAN, ANH TUẤN..."
              maxLength={maxLen + 5}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                isTextTooLong
                  ? "border-rose-500 focus:ring-rose-500/20"
                  : "border-gray-200 focus:border-[#E06D53] focus:ring-[#E06D53]/20"
              }`}
            />
            {isTextTooLong && (
              <p className="text-xs text-rose-600 mt-1">
                Nội dung khắc đã vượt quá giới hạn {maxLen} ký tự.
              </p>
            )}
          </div>

          {/* Chọn font chữ */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Kiểu font chữ khắc:
            </label>
            <select
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all cursor-pointer"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* QR Code link tùy chọn */}
          <div>
            <button
              type="button"
              onClick={() => setShowQrInput(!showQrInput)}
              className="text-xs text-[#E06D53] font-medium hover:underline flex items-center gap-x-1.5"
            >
              <FaQrcode />
              <span>{showQrInput ? "Ẩn tùy chọn khắc mã QR" : "+ Khắc kèm mã QR (Trang cá nhân, Zalo, link quà tặng...)"}</span>
            </button>
            {showQrInput && (
              <div className="mt-2.5">
                <input
                  type="url"
                  value={customQrUrl}
                  onChange={(e) => setCustomQrUrl(e.target.value)}
                  placeholder="https://facebook.com/your-profile hoặc link bất kỳ..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E06D53] focus:ring-2 focus:ring-[#E06D53]/20 transition-all"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Hệ thống sẽ khắc mã QR dẫn tới link này trên mặt sau móc khóa.
                </span>
              </div>
            )}
          </div>

          {/* MÔ PHỎNG XEM TRƯỚC (LIVE PREVIEW MOCKUP) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Xem trước mô phỏng nội dung khắc:
            </span>
            <div className="h-20 bg-[#FAF9F6] rounded-xl border border-dashed border-gray-300 flex items-center justify-center p-3 relative overflow-hidden">
              {customText.trim() ? (
                <div className="text-center">
                  <p className={`text-xl sm:text-2xl font-bold text-[#1E2229] ${selectedFontObj.cssClass} transition-all`}>
                    {customText}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block font-sans">
                    Font: {selectedFontObj.id}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic font-sans">
                  (Nhập nội dung ở trên để xem trước font chữ mô phỏng)
                </span>
              )}
              {customQrUrl.trim() && (
                <div className="absolute right-3 top-3 bottom-3 flex items-center justify-center bg-white px-2.5 rounded-lg border border-gray-200 shadow-xs">
                  <FaQrcode className="text-xl text-[#1E2229]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. BỘ CHỌN SỐ LƯỢNG (QUANTITY SELECTOR) */}
      <div className="flex items-center gap-x-4">
        <span className="text-xs sm:text-sm font-bold text-[#1E2229]">Số lượng:</span>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <button
            type="button"
            onClick={() => handleQuantityChange("minus")}
            disabled={quantityCount <= 1}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            aria-label="Giảm"
          >
            <FaMinus className="text-xs" />
          </button>
          <span className="w-12 text-center font-extrabold text-sm text-[#1E2229] select-none">
            {quantityCount}
          </span>
          <button
            type="button"
            onClick={() => handleQuantityChange("plus")}
            disabled={!selectedVariant?.allowPreorder && quantityCount >= currentStock}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            aria-label="Tăng"
          >
            <FaPlus className="text-xs" />
          </button>
        </div>
      </div>

      {/* 5. CÁC NÚT HÀNH ĐỘNG: THÊM GIỎ & MUA NGAY (COD) */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          disabled={!isAvailable || isTextTooLong}
          className="flex-1 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm border-2 border-[#1E2229] text-[#1E2229] hover:bg-[#1E2229] hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
        >
          Thêm vào giỏ hàng
        </button>
        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={!isAvailable || isTextTooLong}
          className="flex-1 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-[#E06D53] text-white hover:bg-[#C85A42] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md"
        >
          Mua ngay (COD)
        </button>
      </div>
    </div>
  );
};

export default SingleProductDynamicFields;