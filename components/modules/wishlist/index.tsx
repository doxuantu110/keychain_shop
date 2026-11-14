"use client";

import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import WishItem from "@/components/WishItem";
import apiClient from "@/lib/api";
import { nanoid } from "nanoid";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";
import { FaHeart, FaCube } from "react-icons/fa6";

export const WishlistModule = () => {
  const { data: session } = useSession();
  const { wishlist, setWishlist } = useWishlistStore();

  const getWishlistByUserId = async (id: string) => {
    try {
      const response = await apiClient.get(`/api/wishlist/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();
      const productArray: any[] = [];
      data?.forEach((item: any) => {
        productArray.push({
          id: item?.product?.id,
          title: item?.product?.title,
          price: item?.product?.price,
          image: item?.product?.mainImage,
          slug: item?.product?.slug,
          stockAvailabillity: item?.product?.inStock,
        });
      });
      setWishlist(productArray);
    } catch (err) {
      console.error(err);
    }
  };

  const getUserByEmail = async () => {
    if (session?.user?.email) {
      try {
        const response = await apiClient.get(`/api/users/email/${session.user.email}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (data?.id) {
          getWishlistByUserId(data.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    getUserByEmail();
  }, [session?.user?.email, wishlist.length]);

  return (
    <div className="bg-white rounded-3xl border border-[#E7E5E4] p-6 sm:p-8 shadow-sm">
      {wishlist && wishlist.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#FDF2EE] text-[#E06D53] flex items-center justify-center text-2xl mx-auto mb-4">
            <FaHeart />
          </div>
          <h3 className="text-xl font-bold text-[#1E2229]">
            Danh sách yêu thích đang trống
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 mb-6">
            Hãy khám phá các mẫu móc khóa in 3D và phụ kiện độc đáo để lưu lại những mẫu bạn yêu thích nhé!
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2229] text-white font-semibold text-xs sm:text-sm hover:bg-[#2D323C] transition-colors"
          >
            <FaCube className="text-[#E06D53]" />
            <span>Khám phá sản phẩm ngay</span>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th>Sản phẩm</th>
                <th>Tình trạng</th>
                <th>Giá bán</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {wishlist &&
                wishlist.map((item) => (
                  <WishItem
                    id={item?.id}
                    title={item?.title}
                    price={item?.price}
                    image={item?.image}
                    slug={item?.slug}
                    stockAvailabillity={item?.stockAvailabillity}
                    key={nanoid()}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};