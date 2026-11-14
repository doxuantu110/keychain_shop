export interface ProductVariant {
  id: string;
  productId: string;
  variantKey: string;
  sizeLabel: string;
  color?: string | null;
  material?: string | null;
  sku: string;
  price: number;
  stock: number;
  isStockAudited?: boolean;
  allowPreorder: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  imageID: string;
  productID: string;
  image: string;
}

export interface ProductCategory {
  id?: string;
  name: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  price: number; // Giá khởi điểm "Từ..."
  rating?: number;
  description: string;
  manufacturer?: string;
  inStock: number; // 1 nếu còn hàng/preorder, 0 nếu hết
  isCustomizable: boolean;
  maxCustomTextLength: number;
  isActive: boolean;

  // AR & 3D Assets
  arEnabled?: boolean;
  glbUrl?: string | null;
  usdzUrl?: string | null;

  // Social links
  shopeeUrl?: string | null;
  tiktokUrl?: string | null;

  category?: ProductCategory;
  categoryId?: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

