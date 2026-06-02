import type { ProductVariantInput } from "@/types/database";

export type ProductFormPayload = {
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  is_active: boolean;
  variants: ProductVariantInput[];
  images: File[];
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readNumber(formData: FormData, key: string, fallback = 0) {
  const rawValue = readString(formData, key);
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function readBoolean(formData: FormData, key: string, fallback = true) {
  const rawValue = readString(formData, key).toLowerCase();

  if (["true", "1", "yes", "on"].includes(rawValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(rawValue)) {
    return false;
  }

  return fallback;
}

function readVariants(formData: FormData): ProductVariantInput[] {
  const rawVariants = readString(formData, "variants");

  if (!rawVariants) {
    return [];
  }

  const parsed = JSON.parse(rawVariants) as ProductVariantInput[];

  if (!Array.isArray(parsed)) {
    throw new Error("variants must be a JSON array");
  }

  return parsed.map((variant) => ({
    color: variant.color?.trim() || null,
    size: variant.size?.trim() || null,
    stock: Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : 0,
  }));
}

export function parseProductFormData(formData: FormData): ProductFormPayload {
  const name = readString(formData, "name");
  const slug = readString(formData, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const category = readString(formData, "category");

  if (!name || !slug || !category) {
    throw new Error("name, slug, and category are required");
  }

  const images = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  return {
    name,
    slug,
    description: readOptionalString(formData, "description"),
    category,
    price: readNumber(formData, "price"),
    stock: readNumber(formData, "stock"),
    is_active: readBoolean(formData, "is_active"),
    variants: readVariants(formData),
    images,
  };
}
