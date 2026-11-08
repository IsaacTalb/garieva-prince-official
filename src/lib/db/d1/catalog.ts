import "server-only";
import { getDatabase } from "./d1/client";
import { Product, type CreateProductInput } from "@/schemas/catalog";
import { getProductById } from "./d1/products";
import { getFirstMediaByProduct } from "./d1/product_media";

/**
 * Legacy catalog repository - D1-backed
 * 
 * This is the modern D1 implementation that replaces the PostgreSQL runtime.
 * All queries use SQLite/D1 SQL syntax (no PostgreSQL-specific features).
 */

export async function getPublishedProducts(search = ""): Promise<Product[]> {
  const db = getDatabase();
  
  // Search in name and description, case-insensitive
  const searchTerm = search.trim().slice(0, 120);
  const searchPattern = `%${searchTerm}%`;
  
  const rows = await db`
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(pm.object_key, 'default.jpg') as image_key,
      pm.alt_text as image_alt
    FROM products p
    LEFT JOIN product_media pm ON p.id = pm.product_id 
      AND pm.position IS NULL 
      AND pm.created_at = (
        SELECT MIN(created_at) FROM product_media WHERE product_id = p.id
      )
    WHERE p.is_active = 1
      AND (${searchTerm} = '' OR lower(p.name || ' ') LIKE lower(${searchPattern} || '%') OR lower(p.description) LIKE lower(${searchPattern} || '%'))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 48
  `;
  
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image_key: row.image_key,
    image_alt: row.image_alt ?? undefined,
    image_url: null, // Will be set by caller with R2 URL
  }));
}

export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  const db = getDatabase();
  
  const [row] = await db`
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(pm.object_key, 'default.jpg') as image_key,
      pm.alt_text as image_alt
    FROM products p
    LEFT JOIN product_media pm ON p.id = pm.product_id 
      AND pm.position IS NULL 
      AND pm.created_at = (
        SELECT MIN(created_at) FROM product_media WHERE product_id = p.id
      )
    WHERE p.is_active = 1 AND p.slug = ${slug}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 1
  `;
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image_key: row.image_key,
    image_alt: row.image_alt ?? undefined,
    image_url: null, // Will be set by caller with R2 URL
  };
}

export async function getPublishedProductsWithCounts(): Promise<{ products: Product[]; total: number }[]> {
  const db = getDatabase();
  
  // Get total count first (for pagination)
  const [totalRow] = await db`SELECT COUNT(*) as total FROM products WHERE is_active = 1`;
  const total = totalRow?.total ?? 0;
  
  // Get products with counts
  const rows = await db`
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(pm.object_key, 'default.jpg') as image_key,
      pm.alt_text as image_alt,
      (SELECT COUNT(*) FROM product_items WHERE product_id = p.id AND status = 'available') as stock_count
    FROM products p
    LEFT JOIN product_media pm ON p.id = pm.product_id 
      AND pm.position IS NULL 
      AND pm.created_at = (
        SELECT MIN(created_at) FROM product_media WHERE product_id = p.id
      )
    WHERE p.is_active = 1
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 48
  `;
  
  return rows.map((row) => ({
    products: [{
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      image_key: row.image_key,
      image_alt: row.image_alt ?? undefined,
      image_url: null,
    }],
    total: stock_count ?? 0,
  })).filter(Boolean) as { products: Product[]; total: number }[];
}

/**
 * Get all active products (for admin panel)
 */
export async function getAllActiveProducts(limit = 100, offset = 0): Promise<Product[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      COALESCE(pm.object_key, 'default.jpg') as image_key,
      pm.alt_text as image_alt
    FROM products p
    LEFT JOIN product_media pm ON p.id = pm.product_id 
      AND pm.position IS NULL 
      AND pm.created_at = (
        SELECT MIN(created_at) FROM product_media WHERE product_id = p.id
      )
    WHERE p.is_active = 1
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    image_key: row.image_key,
    image_alt: row.image_alt ?? undefined,
    image_url: null,
  }));
}

/**
 * Create a new product (admin only)
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const db = getDatabase();
  const user = requireUser(); // Must be authenticated
  
  // Validate admin role
  if (!(await checkAdminAccess(user.id))) {
    throw new Error("Only admins can create products");
  }
  
  const productId = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  await db`
    INSERT INTO products (id, name, slug, description, price, stock, is_active, created_at, updated_at)
    VALUES (${productId}, ${input.name}, ${input.slug}, ${input.description ?? null}, 
            ${input.price ?? 0}, ${input.stock ?? 0}, ${input.isActive ?? 1}, 
            datetime('now'), datetime('now'))
    RETURNING id, name, slug, description, price, stock, is_active, created_at, updated_at
  `;
  
  return {
    id: productId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? undefined,
    image_key: null,
    image_alt: null,
    image_url: null,
  };
}

/**
 * Update product (admin only)
 */
export async function updateProduct({
  productId,
  name,
  slug,
  description,
  price,
  stock,
}: {
  productId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  stock?: number;
}): Promise<Product | null> {
  const db = getDatabase();
  
  // Validate admin role
  if (!(await checkAdminAccess(requireUser().id))) {
    throw new Error("Only admins can update products");
  }
  
  const [updated] = await db`
    UPDATE products 
    SET 
      name = COALESCE(${name}, name),
      slug = COALESCE(${slug}, slug),
      description = COALESCE(${description}, description),
      price = COALESCE(${price}, price),
      stock = COALESCE(${stock}, stock),
      updated_at = datetime('now')
    WHERE id = ${productId}
    RETURNING id, name, slug, description, price, stock, is_active, created_at, updated_at
  `;
  
  if (!updated) return null;
  
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? undefined,
    image_key: null,
    image_alt: null,
    image_url: null,
  };
}

/**
 * Delete product (admin only)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const db = getDatabase();
  
  // Validate admin role
  if (!(await checkAdminAccess(requireUser().id))) {
    throw new Error("Only admins can delete products");
  }
  
  // Delete from products table (cascade will handle media)
  await db`DELETE FROM products WHERE id = ${productId}`;
}

/**
 * Check if product exists
 */
export async function productExists(productId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM products WHERE id = ${productId} LIMIT 1`;
  return !!result;
}

/**
 * Get product by ID (with variants)
 */
export async function getProductWithVariants(productId: string): Promise<{
  product: Product | null;
  variants: Array<{ size: string; color_name: string; color_hex: string | null; stock: number; price: number }> | [];
}> {
  const db = getDatabase();
  
  // Get base product
  const [productRow] = await db`
    SELECT id, name, slug, description, is_active FROM products WHERE id = ${productId} LIMIT 1
  `;
  
  if (!productRow) return { product: null, variants: [] };
  
  // Get variants
  const [variantsRow] = await db`
    SELECT size, color_name, color_hex, stock, price 
    FROM product_variants 
    WHERE product_id = ${productId}
    ORDER BY color_hex DESC, size DESC
  `;
  
  return {
    product: {
      id: productRow.id,
      name: productRow.name,
      slug: productRow.slug,
      description: productRow.description ?? undefined,
      image_key: null,
      image_alt: null,
      image_url: null,
    },
    variants: variantsRow ? [{
      size: variantsRow.size,
      color_name: variantsRow.color_name,
      color_hex: variantsRow.color_hex,
      stock: variantsRow.stock ?? 0,
      price: variantsRow.price ?? productRow.price ?? 0,
    }] : [],
  };
}