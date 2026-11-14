import { SectionTitle } from "@/components";
import { Loader } from "@/components/Loader";
import { CartModule } from "@/components/modules/cart";
import { Suspense } from "react";

const CartPage = () => {
  return (
    <div className="bg-[#FAF9F6] min-h-screen pb-16">
      <SectionTitle title="Giỏ Hàng Của Bạn" path="Trang chủ / Giỏ hàng" />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-6">
        <Suspense fallback={<Loader />}>
          <CartModule />
        </Suspense>
      </div>
    </div>
  );
};

export default CartPage;