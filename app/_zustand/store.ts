import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, generateCartItemId } from "@/types/cart";

export type ProductInCart = CartItem;

export type State = {
  products: CartItem[];
  allQuantity: number;
  total: number;
};

export type AddToCartPayload = {
  productId?: string;
  variantId?: string;
  productTitle?: string;
  productSlug?: string;
  image?: string;
  sizeLabel?: string;
  color?: string | null;
  material?: string | null;
  price: number;
  amount: number;
  stock?: number;
  allowPreorder?: boolean;
  customText?: string | null;
  customFont?: string | null;
  customQrUrl?: string | null;
  // Fallbacks for legacy callers
  id?: string;
  title?: string;
};

export type Actions = {
  addToCart: (item: AddToCartPayload) => void;
  removeFromCart: (cartItemIdOrId: string) => void;
  updateCartAmount: (cartItemIdOrId: string, quantity: number) => void;
  updateCustomization: (
    cartItemIdOrId: string,
    customization: { customText?: string; customFont?: string; customQrUrl?: string }
  ) => void;
  calculateTotals: () => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getEstimatedSubtotal: () => number;
};

export const useProductStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      products: [],
      allQuantity: 0,
      total: 0,

      addToCart: (newProduct) => {
        set((state) => {
          const productId = newProduct.productId || newProduct.id || "";
          const variantId = newProduct.variantId || "default";
          const productTitle = newProduct.productTitle || newProduct.title || "";
          const customText = newProduct.customText ? newProduct.customText.trim() : null;
          const customFont = newProduct.customFont ? newProduct.customFont.trim() : null;
          const customQrUrl = newProduct.customQrUrl ? newProduct.customQrUrl.trim() : null;

          const cartItemId = generateCartItemId({
            productId,
            variantId,
            customText,
            customFont,
            customQrUrl,
          });

          // Quy tắc gộp: Chỉ gộp khi trùng productId, variantId VÀ toàn bộ customization
          const existingIndex = state.products.findIndex(
            (item) => item.cartItemId === cartItemId || item.id === cartItemId
          );

          let updatedProducts: CartItem[];

          if (existingIndex > -1) {
            // Gộp số lượng
            updatedProducts = state.products.map((item, idx) => {
              if (idx === existingIndex) {
                const newAmount = item.amount + (newProduct.amount || 1);
                // Giới hạn tồn kho nếu không cho phép preorder
                const maxStock = item.allowPreorder ? Infinity : (item.stock || Infinity);
                return {
                  ...item,
                  amount: Math.min(newAmount, maxStock),
                };
              }
              return item;
            });
          } else {
            // Thêm mới một cart item độc lập
            const newItem: CartItem = {
              cartItemId,
              id: cartItemId, // Alias tương thích
              productId,
              variantId,
              productTitle,
              title: productTitle, // Alias tương thích
              productSlug: newProduct.productSlug || "",
              image: newProduct.image || "",
              sizeLabel: newProduct.sizeLabel || "",
              color: newProduct.color || null,
              material: newProduct.material || null,
              price: Number(newProduct.price) || 0,
              amount: Math.max(1, newProduct.amount || 1),
              stock: newProduct.stock !== undefined ? newProduct.stock : 99,
              allowPreorder: Boolean(newProduct.allowPreorder),
              customText,
              customFont,
              customQrUrl,
            };
            updatedProducts = [...state.products, newItem];
          }

          // Tự động tính toán lại tổng
          let allQuantity = 0;
          let total = 0;
          updatedProducts.forEach((item) => {
            allQuantity += item.amount;
            total += item.amount * item.price;
          });

          return {
            products: updatedProducts,
            allQuantity,
            total,
          };
        });
      },

      removeFromCart: (cartItemIdOrId) => {
        set((state) => {
          const updatedProducts = state.products.filter(
            (item) => item.cartItemId !== cartItemIdOrId && item.id !== cartItemIdOrId
          );

          let allQuantity = 0;
          let total = 0;
          updatedProducts.forEach((item) => {
            allQuantity += item.amount;
            total += item.amount * item.price;
          });

          return {
            products: updatedProducts,
            allQuantity,
            total,
          };
        });
      },

      updateCartAmount: (cartItemIdOrId, amount) => {
        set((state) => {
          if (amount <= 0) {
            // Nếu giảm về 0, tự động xóa
            const updatedProducts = state.products.filter(
              (item) => item.cartItemId !== cartItemIdOrId && item.id !== cartItemIdOrId
            );
            let allQuantity = 0;
            let total = 0;
            updatedProducts.forEach((item) => {
              allQuantity += item.amount;
              total += item.amount * item.price;
            });
            return { products: updatedProducts, allQuantity, total };
          }

          const updatedProducts = state.products.map((item) => {
            if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
              const maxStock = item.allowPreorder ? Infinity : (item.stock || Infinity);
              return {
                ...item,
                amount: Math.min(amount, maxStock),
              };
            }
            return item;
          });

          let allQuantity = 0;
          let total = 0;
          updatedProducts.forEach((item) => {
            allQuantity += item.amount;
            total += item.amount * item.price;
          });

          return {
            products: updatedProducts,
            allQuantity,
            total,
          };
        });
      },

      updateCustomization: (cartItemIdOrId, customization) => {
        set((state) => {
          const targetItem = state.products.find(
            (item) => item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId
          );
          if (!targetItem) return { products: state.products };

          const newText = customization.customText !== undefined ? customization.customText.trim() : targetItem.customText;
          const newFont = customization.customFont !== undefined ? customization.customFont.trim() : targetItem.customFont;
          const newQr = customization.customQrUrl !== undefined ? customization.customQrUrl.trim() : targetItem.customQrUrl;

          const newCartItemId = generateCartItemId({
            productId: targetItem.productId,
            variantId: targetItem.variantId,
            customText: newText,
            customFont: newFont,
            customQrUrl: newQr,
          });

          const updatedProducts = state.products.map((item) => {
            if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
              return {
                ...item,
                cartItemId: newCartItemId,
                id: newCartItemId,
                customText: newText,
                customFont: newFont,
                customQrUrl: newQr,
              };
            }
            return item;
          });

          return { products: updatedProducts };
        });
      },

      calculateTotals: () => {
        set((state) => {
          let allQuantity = 0;
          let total = 0;
          state.products.forEach((item) => {
            allQuantity += item.amount;
            total += item.amount * item.price;
          });

          return {
            allQuantity,
            total,
          };
        });
      },

      clearCart: () => {
        set({
          products: [],
          allQuantity: 0,
          total: 0,
        });
      },

      getTotalItems: () => {
        return get().allQuantity;
      },

      getEstimatedSubtotal: () => {
        return get().total;
      },
    }),
    {
      name: "keychain-cart-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Fallback migration handler if storage had legacy items
      migrate: (persistedState: any) => {
        if (!persistedState || !Array.isArray(persistedState.products)) {
          return { products: [], allQuantity: 0, total: 0 };
        }
        const migratedProducts = persistedState.products.map((p: any) => ({
          ...p,
          cartItemId: p.cartItemId || p.id,
          productId: p.productId || p.id,
          variantId: p.variantId || "default",
          productTitle: p.productTitle || p.title || "",
          title: p.title || p.productTitle || "",
          amount: p.amount || 1,
          price: p.price || 0,
        }));
        return {
          ...persistedState,
          products: migratedProducts,
        };
      },
    }
  )
);
