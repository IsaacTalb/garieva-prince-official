import "server-only";
import { getDatabase } from "./d1/client";
import { PublicProductSchema, type PublicProduct } from "@/schemas/catalog";

/**
 * Get a product by ID
 */
export async function getProductById(productId: string): Promise<PublicProduct | null> {
  const db = getDatabase();
  const rows = await db`
    SELECT 
      p.id, p.name, p.slug, p.description, p.price, p.stock, p.is_active, p.created_at, p.updated_at,
      m.object_key as image_key, m.alt_text as image_alt
    FROM products p
    LEFT JOIN (
      SELECT object_key, alt_text FROM product_media 
      WHERE product_id = ${productId}
      ORDER BY position, id LIMIT 1
    ) m ON TRUE
    WHERE p.id = ${productId}
  `;
  
  if (!rows[0]) return null;
  
  try {
    return PublicProductSchema.parse({ ...rows[0], image_url: null });
  } catch (error) {
    throw new Error(`Invalid product data for ${productId}: ${(error as Error).message}`);
  }
}

/**
 * Get a product by slug
 */
export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const db = getDatabase();
  const rows = await db`
    SELECT 
      p.id, p.name, p.slug, p.description, p.price, p.stock, p.is_active, p.created_at, p.updated_at,
      m.object_key as image_key, m.alt_text as image_alt
    FROM products p
    LEFT JOIN (
      SELECT object_key, alt_text FROM product_media 
      WHERE product_id = p.id
      ORDER BY position, id LIMIT 1
    ) m ON TRUE
    WHERE p.slug = ${slug} AND p.deleted_at IS NULL
  `;
  
  if (!rows[0]) return null;
  
  try {
    return PublicProductSchema.parse({ ...rows[0], image_url: null });
  } catch (error) {
    throw new Error(`Invalid product data for slug ${slug}: ${(error as Error).message}`);
  }
}

/**
 * Get published products with optional search and pagination
 */
export async function getPublishedProducts(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: PublicProduct[]; total: number }> {
  const db = getDatabase();
  
  let query = `
    SELECT 
      p.id, p.name, p.slug, p.description, p.price, p.stock, p.is_active, p.created_at, p.updated_at,
      m.object_key as image_key, m.alt_text as image_alt
    FROM products p
    LEFT JOIN (
      SELECT object_key, alt_text FROM product_media 
      WHERE product_id = p.id
      ORDER BY position, id LIMIT 1
    ) m ON TRUE
    WHERE p.status = 'published' AND p.deleted_at IS NULL
  `;
  
  if (options?.search) {
    query += ` AND position(lower(${options.search}) in lower(p.name || ' ' || p.description)) > 0`;
  }
  
  let limit: number | undefined;
  let offset: number | undefined;
  
  if (options?.limit) limit = options.limit;
  if (options?.offset) offset = options.offset;
  
  // Calculate total count first
  const countQuery = query.replace("SELECT", "SELECT COUNT(*) as c FROM (", "") + 
    ` GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}) t`;
  
  const [countResult] = await db`${countQuery}`;
  const total = typeof countResult.c === "number" ? countResult.c : 0;
  
  // Get actual rows
  if (limit || offset) {
    query += ` ORDER BY p.created_at DESC, p.id DESC LIMIT ${limit} OFFSET ${offset}`;
    const rows = await db`${query}`;
    
    try {
      return { rows: rows.map(row => PublicProductSchema.parse({ ...row, image_url: null })), total };
    } catch (error) {
      throw new Error(`Invalid product data in list: ${(error as Error).message}`);
    }
  } else {
    const rows = await db`${query} ORDER BY p.created_at DESC, p.id DESC LIMIT 48`;
    try {
      return { rows: rows.map(row => PublicProductSchema.parse({ ...row, image_url: null })), total };
    } catch (error) {
      throw new Error(`Invalid product data in list: ${(error as Error).message}`);
    }
  }
}

/**
 * Create a new product
 */
export async function createProduct({
  name,
  slug,
  description,
  price,
  stock = 0,
}: {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  stock?: number;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  const [result] = await db`
    INSERT INTO products (name, slug, description, price, stock)
    VALUES (${name}, ${slug}, ${description}, ${Math.floor(price)}, ${stock})
    RETURNING id
  `;
  
  return result;
}

/**
 * Update a product (partial update)
 */
export async function updateProduct({
  productId,
  name,
  slug,
  description,
  price,
  stock,
  is_active,
}: {
  productId: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  price?: number | null;
  stock?: number | null;
  is_active?: number | null;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    UPDATE products
    SET name = ${name ?? "null"}, 
        slug = ${slug ?? "null"}, 
        description = ${description ?? "null"},
        price = ${price ?? "null"},
        stock = ${stock ?? "null"},
        is_active = ${is_active ?? "null"}
    WHERE id = ${productId}
  `;
}

/**
 * Soft delete a product
 */
export async function softDeleteProduct(productId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE products SET deleted_at = datetime('now') WHERE id = ${productId}`;
}

/**
 * Get total stock for a product across all variants and items
 */
export async function getProductTotalStock(productId: string): Promise<number> {
  const db = getDatabase();
  
  const result = await db`
    SELECT COALESCE(SUM(stock), 0) as total_stock FROM products 
    WHERE id = ${productId} AND is_active = 1 AND deleted_at IS NULL
  `;
  
  return typeof result.total_stock === "number" ? result.total_stock : 0;
}

/**
 * Check if a product exists
 */
export async function productExists(productId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM products WHERE id = ${productId} LIMIT 1`;
  return !!result;
}

/**
 * Delete a product (hard delete)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM products WHERE id = ${productId}`;
}