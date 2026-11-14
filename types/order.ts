export type OrderStatus =
  | "PENDING"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  customText?: string | null;
  customFont?: string | null;
  customQrUrl?: string | null;
}

export interface CreateOrderInput {
  name?: string;
  lastname?: string;
  fullName: string;
  phone: string;
  email: string;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  orderNotice?: string | null;
  paymentMethod?: string;
  items: OrderItemInput[];
}

export interface OrderItemSnapshot {
  id: string;
  customerOrderId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  productTitle: string;
  sizeLabel?: string | null;
  customText?: string | null;
  customFont?: string | null;
  customQrUrl?: string | null;
  isEstimatedSnapshot?: boolean;
  snapshotSource?: string;

  // Compatibility aliases
  priceSnapshot?: number;
  productTitleSnapshot?: string;
  variantNameSnapshot?: string;
  skuSnapshot?: string;
  customTextSnapshot?: string;
  customizationJson?: string | null;
  product?: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    arEnabled?: boolean;
    glbUrl?: string | null;
    usdzUrl?: string | null;
  };
  variant?: {
    id: string;
    sizeLabel: string;
    sku: string;
    price: number;
    color?: string | null;
    material?: string | null;
  } | null;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface OrderPaymentItem {
  id: string;
  orderId: string;
  provider: string;
  txnRef: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  orderCode: string;
  name: string;
  lastname: string;
  fullName?: string | null;
  phone: string;
  email: string;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  adress?: string;
  company?: string;
  apartment?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  orderNotice?: string | null;
  dateTime?: string;
  createdAt: string;
  updatedAt: string;
  products?: OrderItemSnapshot[];
  statusHistory?: OrderStatusHistoryItem[];
  payments?: OrderPaymentItem[];
}

