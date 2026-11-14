export interface CartItem {
  // Định danh duy nhất dựa trên tổ hợp: productId + variantId + customization
  cartItemId: string;
  id: string; // Tương thích với code cũ sử dụng product.id

  productId: string;
  variantId: string;
  productTitle: string;
  title: string; // Alias tương thích
  productSlug: string;
  image: string;

  // Thuộc tính biến thể
  sizeLabel?: string;
  color?: string | null;
  material?: string | null;

  // Số lượng & Tồn kho tham khảo
  amount: number;
  price: number; // Đơn giá tham khảo (backend sẽ tính giá chính thức từ DB)
  stock?: number;
  allowPreorder?: boolean;

  // Dữ liệu cá nhân hóa (Personalization)
  customText?: string | null;
  customFont?: string | null;
  customQrUrl?: string | null;
}

export function generateCartItemId(item: {
  productId: string;
  variantId?: string | null;
  customText?: string | null;
  customFont?: string | null;
  customQrUrl?: string | null;
}): string {
  const pId = item.productId || "";
  const vId = item.variantId || "default";
  const text = (item.customText || "").trim().toLowerCase();
  const font = (item.customFont || "default").trim().toLowerCase();
  const qr = (item.customQrUrl || "").trim().toLowerCase();

  return `${pId}__${vId}__${text}__${font}__${qr}`;
}

/**
 * Định dạng số tiền sang chuẩn Việt Nam Đồng (VND).
 * An toàn với null, undefined, NaN, chuỗi số và số âm.
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(0);
  }

  const numericValue = typeof amount === "number" ? amount : Number(amount);

  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(0);
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numericValue);
}


