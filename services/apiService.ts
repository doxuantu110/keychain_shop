import apiClient from "@/lib/api";
import { Product } from "@/types/product";
import { CreateOrderInput, CustomerOrder } from "@/types/order";

export class ApiError extends Error {
  statusCode: number;
  details: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = (typeof data === "object" && (data.error || data.message)) || res.statusText || "Request failed";
    const details = (typeof data === "object" && data.details) || null;
    throw new ApiError(errorMsg, res.status, details);
  }

  return data as T;
}

export const productService = {
  async getBySlug(slug: string): Promise<Product> {
    const res = await apiClient.get(`/api/slugs/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    return handleResponse<Product>(res);
  },

  async getAll(page: number = 1): Promise<Product[]> {
    const res = await apiClient.get(`/api/products?page=${page}`, {
      cache: "no-store",
    });
    return handleResponse<Product[]>(res);
  },

  async search(query: string): Promise<Product[]> {
    const res = await apiClient.get(`/api/search?query=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    return handleResponse<Product[]>(res);
  },
};

export const variantService = {
  async getByProductId(productId: string) {
    const res = await apiClient.get(`/api/variants/product/${encodeURIComponent(productId)}`, {
      cache: "no-store",
    });
    return handleResponse<any[]>(res);
  },

  async checkStock(items: { variantId: string; quantity: number }[]) {
    const res = await apiClient.post("/api/variants/check-stock", { items });
    return handleResponse<{ available: boolean; items: any[] }>(res);
  },
};

export interface SepayCheckoutSession {
  checkoutUrl: string;
  fields: Record<string, string | number>;
  orderCode: string;
  amount: number;
}

export const orderService = {
  async create(orderData: CreateOrderInput, idempotencyKey?: string): Promise<{
    id: string;
    orderCode: string;
    subtotal: number;
    shippingFee: number;
    total: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    checkoutSession?: SepayCheckoutSession | null;
    message: string;
  }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await apiClient.post("/api/orders", orderData, { headers });
    return handleResponse(res);
  },

  async getById(idOrOrderCode: string, verifyEmail?: string, verifyPhone?: string): Promise<CustomerOrder> {
    const queryParams = new URLSearchParams();
    if (verifyEmail) queryParams.set("email", verifyEmail);
    if (verifyPhone) queryParams.set("phone", verifyPhone);

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const res = await apiClient.get(`/api/orders/${encodeURIComponent(idOrOrderCode)}${qs}`, {
      cache: "no-store",
    });
    return handleResponse<CustomerOrder>(res);
  },

  async lookup(orderCode: string, email?: string, phone?: string): Promise<CustomerOrder> {
    const res = await apiClient.post("/api/orders/lookup", {
      orderCode,
      email: email || undefined,
      phone: phone || undefined,
    }, {
      cache: "no-store",
    });
    return handleResponse<CustomerOrder>(res);
  },
};

export const paymentService = {
  async createSepayCheckoutSession(orderCode: string, email?: string, phone?: string): Promise<SepayCheckoutSession> {
    const res = await apiClient.post("/api/payments/sepay/checkout-session", {
      orderCode,
      email: email || undefined,
      phone: phone || undefined,
    });
    return handleResponse<SepayCheckoutSession>(res);
  },

  async getSepayStatus(orderCode: string): Promise<{
    id: string;
    orderCode: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    updatedAt: string;
  }> {
    const res = await apiClient.get(`/api/payments/sepay/status/${encodeURIComponent(orderCode)}`, {
      cache: "no-store",
    });
    return handleResponse(res);
  },
};

