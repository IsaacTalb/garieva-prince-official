export type User = {
  id: string;
  email: string;
  email_verified_at: string | null;
  name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color_name: string | null;
  color_hex: string | null;
  stock: number;
  price: number | null;
  created_at: string;
};

export type ProductItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  public_id: string;
  serial_number: string;
  status:
    | "manufacturing"
    | "provisioned"
    | "available"
    | "reserved"
    | "sold"
    | "owned"
    | "listed_for_resale"
    | "transfer_pending"
    | "retired";
  created_at: string;
  updated_at: string;
};

export type Ownership = {
  id: string;
  product_item_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  acquisition_type: "original_purchase" | "resale" | "transfer" | "gift" | "admin_assignment";
  is_current: boolean;
};
