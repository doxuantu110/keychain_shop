"use client";

import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { FaCheck, FaClock, FaXmark, FaWandMagicSparkles, FaQrcode, FaArrowRight, FaBagShopping } from "react-icons/fa6";
import QuantityInputCart from "@/components/QuantityInputCart";
import { sanitize } from "@/lib/sanitize";
import { formatVND } from "@/types/cart";

export const CartModule = () => {
  const { products, removeFromCart, total, allQuantity } = useProductStore();

  const handleRemoveItem = (cartItemIdOrId: string, title: string) => {
    removeFromCart(cartItemIdOrId);
    toast.success(`Đã xóa "${title}" khỏi giỏ hàng`);
  };

  const shippingFee = total >= 300000 || total === 0 ? 0 : 30000;
  const grandTotal = total + shippingFee;

  if (products.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-[#E7E5E4] p-8 max-w-xl mx-auto shadow-sm">
        <div className="w-20 h-20 bg-[#FDF2EE] text-[#E06D53] rounded-2xl flex items-center justify-center mb-4 text-3xl">
          <FaBagShopping />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1E2229] mb-2">Giỏ hàng của bạn đang trống</h2>
        <p className="text-gray-500 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Hãy khám phá các mẫu móc khóa in 3D cá nhân hóa độc đáo và bảng tên sáng tạo để thêm vào giỏ nhé!
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-x-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white font-semibold text-xs sm:text-sm hover:bg-[#2D323C] shadow-sm transition-all"
        >
          <span>Khám phá sản phẩm ngay</span>
          <FaArrowRight className="text-xs" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E7E5E4] p-6 sm:p-8 shadow-sm">
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
        {/* DANH SÁCH SẢN PHẨM TRONG GIỎ */}
        <section aria-labelledby="cart-heading" className="lg:col-span-7">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-sm font-bold text-[#1E2229]">
              Sản phẩm trong giỏ ({allQuantity} món)
            </span>
            <span className="text-xs font-medium text-gray-500">
              {total < 300000 ? (
                <>Mua thêm <strong className="text-[#E06D53]">{formatVND(300000 - total)}</strong> để được Miễn Phí Vận Chuyển!</>
              ) : (
                <span className="text-emerald-600 font-bold">🎉 Bạn đã được Miễn Phí Vận Chuyển!</span>
              )}
            </span>
          </div>

          <ul role="list" className="divide-y divide-gray-100">
            {products.map((product) => {
              const itemId = product.cartItemId || product.id;
              const itemSubtotal = product.price * product.amount;

              return (
                <li key={itemId} className="flex py-6 gap-4 sm:gap-6">
                  <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-gray-100 overflow-hidden bg-[#FAF9F6] p-2 flex items-center justify-center">
                    <Image
                      width={112}
                      height={112}
                      src={
                        product.image
                          ? product.image.startsWith("/")
                            ? product.image
                            : `/${product.image}`
                          : "/images/products/keychain-the-bai-front-back.jpg"
                      }
                      alt={product.title || "Móc khóa in 3D"}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-[#1E2229]">
                            <Link href={`/product/${product.productSlug || ""}`} className="hover:text-[#E06D53] transition-colors">
                              {sanitize(product.productTitle || product.title)}
                            </Link>
                          </h3>

                          {product.sizeLabel && (
                            <div className="mt-1 flex items-center gap-x-2 text-xs text-gray-600">
                              <span className="bg-[#FAF9F6] border border-gray-200 px-2 py-0.5 rounded font-medium text-gray-700">
                                Kích thước: {product.sizeLabel}
                              </span>
                              {product.material && <span>Chất liệu: {product.material}</span>}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveItem(itemId, product.title)}
                          type="button"
                          className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                          title="Xóa khỏi giỏ"
                        >
                          <FaXmark className="text-base" />
                        </button>
                      </div>

                      {/* Chi tiết khắc tên */}
                      {(product.customText || product.customQrUrl) && (
                        <div className="mt-2.5 p-2 rounded-lg bg-[#FAF9F6] border border-gray-200 text-xs text-gray-700 flex flex-col gap-1">
                          {product.customText && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <FaWandMagicSparkles className="text-[#E06D53] text-[11px]" />
                              <span>Khắc: <strong className="text-[#1E2229] uppercase">{product.customText}</strong></span>
                              {product.customFont && <span className="text-gray-400 text-[10px]">({product.customFont})</span>}
                            </div>
                          )}
                          {product.customQrUrl && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <FaQrcode className="text-gray-400" />
                              <span className="truncate max-w-[200px]">QR: {product.customQrUrl}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <QuantityInputCart product={product} />
                        <span className="text-xs text-gray-500 hidden sm:inline">
                          × {formatVND(product.price)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm sm:text-base font-extrabold text-[#1E2229]">
                          {formatVND(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* TỔNG KẾT ĐƠN HÀNG & NÚT TIẾN HÀNH THANH TOÁN */}
        <section
          aria-labelledby="summary-heading"
          className="mt-10 lg:mt-0 lg:col-span-5 rounded-2xl bg-[#FAF9F6] p-6 border border-[#E7E5E4]"
        >
          <h2 id="summary-heading" className="text-base font-bold text-[#1E2229] border-b border-gray-200 pb-3">
            Tóm tắt đơn hàng
          </h2>

          <dl className="mt-4 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between text-gray-600">
              <dt>Tạm tính hàng ({allQuantity} món):</dt>
              <dd className="font-semibold text-[#1E2229]">
                {formatVND(total)}
              </dd>
            </div>

            <div className="flex justify-between text-gray-600">
              <dt>Phí vận chuyển (Tiêu chuẩn):</dt>
              <dd className="font-semibold">
                {shippingFee === 0 ? (
                  <span className="text-emerald-600 font-bold">Miễn phí</span>
                ) : (
                  formatVND(shippingFee)
                )}
              </dd>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <dt className="text-sm sm:text-base font-bold text-[#1E2229]">Tổng thanh toán dự kiến:</dt>
              <dd className="text-lg sm:text-xl font-extrabold text-[#E06D53]">
                {formatVND(grandTotal)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 text-xs text-gray-500 bg-white p-3 rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-700 mb-0.5">Phương thức thanh toán:</p>
            <p>Thanh toán tiền mặt khi nhận hàng (COD). Kiểm tra hàng trước khi thanh toán.</p>
          </div>

          <div className="mt-6">
            <Link
              href="/checkout"
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#E06D53] text-white hover:bg-[#C85A42] shadow-sm transition-all tracking-wide"
            >
              Tiến hành đặt hàng (COD)
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/shop" className="text-xs text-gray-600 hover:text-[#E06D53] transition-colors">
              &larr; Tiếp tục chọn thêm sản phẩm khác
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};