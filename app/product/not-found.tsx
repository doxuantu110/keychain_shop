import Link from "next/link";
import { FaCube, FaArrowLeft } from "react-icons/fa6";

export default function ProductNotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-[#FAF9F6] px-6 py-24">
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E7E5E4] shadow-sm max-w-lg w-full text-center">
        <span className="w-16 h-16 rounded-2xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-2xl font-black mx-auto mb-4">
          404
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2229] tracking-tight">
          Không tìm thấy sản phẩm
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Sản phẩm móc khóa này có thể đã ngừng sản xuất hoặc liên kết bị sai. Bạn hãy tham khảo các mẫu thiết kế khác tại xưởng nhé!
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white text-xs sm:text-sm font-semibold hover:bg-[#2D323C] transition-all shadow-sm"
          >
            <FaCube className="text-[#E06D53]" />
            <span>Xem danh sách sản phẩm</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-[#FAF9F6] text-gray-700 text-xs sm:text-sm font-semibold hover:bg-white transition-all"
          >
            <FaArrowLeft className="text-xs" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </main>
  );
}