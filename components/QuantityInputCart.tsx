"use client";

import { CartItem } from "@/types/cart";
import { useProductStore } from "@/app/_zustand/store";
import React from "react";
import { FaPlus, FaMinus } from "react-icons/fa6";

interface Props {
  product: CartItem;
}

const QuantityInputCart: React.FC<Props> = ({ product }) => {
  const { updateCartAmount } = useProductStore();
  const itemId = product.cartItemId || product.id;

  const handleIncrement = () => {
    if (!product.allowPreorder && product.stock !== undefined && product.amount >= product.stock) {
      return;
    }
    updateCartAmount(itemId, product.amount + 1);
  };

  const handleDecrement = () => {
    if (product.amount > 1) {
      updateCartAmount(itemId, product.amount - 1);
    }
  };

  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white w-28 h-9">
      <button
        type="button"
        className="w-8 h-full text-gray-500 hover:bg-gray-100 flex items-center justify-center disabled:opacity-40"
        onClick={handleDecrement}
        disabled={product.amount <= 1}
      >
        <FaMinus className="text-xs" />
      </button>

      <span className="flex-1 text-center font-semibold text-sm text-gray-800 select-none">
        {product.amount}
      </span>

      <button
        type="button"
        className="w-8 h-full text-gray-500 hover:bg-gray-100 flex items-center justify-center disabled:opacity-40"
        onClick={handleIncrement}
        disabled={!product.allowPreorder && product.stock !== undefined && product.amount >= product.stock}
      >
        <FaPlus className="text-xs" />
      </button>
    </div>
  );
};

export default QuantityInputCart;
