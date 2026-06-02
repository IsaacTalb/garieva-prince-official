export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  stock: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductUpdate = Partial<Omit<Product, "id" | "created_at">> & {
  updated_at?: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  r2_key: string;
  sort_order: number | null;
  created_at: string | null;
};

export type ProductImageInsert = Omit<ProductImage, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  stock: number | null;
  created_at: string | null;
};

export type ProductVariantInsert = Omit<ProductVariant, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ProductVariantInput = {
  color?: string | null;
  size?: string | null;
  stock?: number | null;
};

export type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export type Order = {
  id: string;
  clerk_user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_amount: number;
  status: string | null;
  created_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
};

export type ShippingAddress = {
  id: string;
  order_id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  city: string | null;
  country: string | null;
  postal_code: string | null;
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      product_images: {
        Row: ProductImage;
        Insert: ProductImageInsert;
        Update: Partial<Omit<ProductImage, "id" | "product_id" | "created_at">>;
      };
      product_variants: {
        Row: ProductVariant;
        Insert: ProductVariantInsert;
        Update: Partial<Omit<ProductVariant, "id" | "product_id" | "created_at">>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Order, "id" | "created_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id"> & { id?: string };
        Update: Partial<Omit<OrderItem, "id" | "order_id">>;
      };
      shipping_addresses: {
        Row: ShippingAddress;
        Insert: Omit<ShippingAddress, "id"> & { id?: string };
        Update: Partial<Omit<ShippingAddress, "id" | "order_id">>;
      };
    };
  };
};
