import "server-only";
import { getDatabase } from "./d1/client";
import { PublicProductSchema, type PublicProduct } from "@/schemas/catalog";

/**
 * Variant Repository - D1-backed product variants management
 */

type VariantData = {
  id?: string;
  product_id: string;
  size?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  stock: number;
  price?: number | null;
};

/**
 * Get variant by ID
 */
export async function getVariantById(variantId: string): Promise<Variant | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM product_variants WHERE id = ${variantId}`;
  
  if (!rows[0]) return null;
  
  try {
    return parseVariant(rows[0]);
  } catch (error) {
    throw new Error(`Invalid variant data for ${variantId}: ${(error as Error).message}`);
  }
}

/**
 * Get variants by product ID
 */
export async function getVariantsByProductId(productId: string): Promise<Variant[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      p.id, p.name, p.slug, p.description, p.price as product_price, p.stock as product_stock, p.is_active,
      pv.id as variant_id, pv.size, pv.color_name, pv.color_hex, pv.stock as variant_stock, pv.price as variant_price
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    WHERE p.id = ${productId}
    ORDER BY pv.created_at DESC
  `;
  
  return rows.map(row => ({
    ...parseVariant(row),
    product: {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | null,
      price: row.product_price as number,
      stock: row.product_stock as number,
      is_active: row.is_active === 1 ? true : false,
    },
  }));
}

/**
 * Get variants by product slug
 */
export async function getVariantsByProductSlug(slug: string): Promise<Variant[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      p.id, p.name, p.slug, p.description, p.price as product_price, p.stock as product_stock, p.is_active,
      pv.id as variant_id, pv.size, pv.color_name, pv.color_hex, pv.stock as variant_stock, pv.price as variant_price
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    WHERE p.slug = ${slug} AND p.deleted_at IS NULL
    ORDER BY pv.created_at DESC
  `;
  
  return rows.map(row => ({
    ...parseVariant(row),
    product: {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | null,
      price: row.product_price as number,
      stock: row.product_stock as number,
      is_active: row.is_active === 1 ? true : false,
    },
  }));
}

/**
 * Create a new product variant
 */
export async function createVariant({
  productId,
  size,
  color_name,
  color_hex,
  stock = 0,
  price,
}: VariantData): Promise<Variant> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO product_variants (id, product_id, size, color_name, color_hex, stock, price, created_at)
      VALUES (${generateVariantId()}, ${productId}, ${size}, ${color_name}, ${color_hex}, ${stock}, ${price}, datetime('now'))
      RETURNING *
    `;
    
    return parseVariant(result);
  } catch (error) {
    throw new Error(`Failed to create variant: ${(error as Error).message}`);
  }
}

/**
 * Update a variant (partial update)
 */
export async function updateVariant({
  variantId,
  size,
  color_name,
  color_hex,
  stock,
  price,
}: {
  variantId: string;
  size?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  stock?: number | null;
  price?: number | null;
}): Promise<Variant | null> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      UPDATE product_variants
      SET size = ${size ?? "null"}, 
          color_name = ${color_name ?? "null"}, 
          color_hex = ${color_hex ?? "null"},
          stock = ${stock ?? "null"},
          price = ${price ?? "null"}
      WHERE id = ${variantId}
      RETURNING *
    `;
    
    if (!result) return null;
    
    return parseVariant(result);
  } catch (error) {
    throw new Error(`Failed to update variant: ${(error as Error).message}`);
  }
}

/**
 * Delete a variant
 */
export async function deleteVariant(variantId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM product_variants WHERE id = ${variantId}`;
}

/**
 * Get variants with pagination (for admin listing)
 */
export async function getVariants({
  limit = 50,
  offset = 0,
  productId,
}: {
  limit?: number;
  offset?: number;
  productId?: string | null;
}): Promise<{ rows: Variant[]; total: number }> {
  const db = getDatabase();
  
  let query = `SELECT COUNT(*) as total FROM product_variants`;
  if (productId) {
    query += ` WHERE product_id = ${productId}`;
  }
  
  const [countResult] = await db`${query}`;
  const total = typeof countResult.total === "number" ? countResult.total : 0;
  
  let rows: any[] = [];
  
  if (limit || offset) {
    const limitVal = productId ? limit : undefined;
    const offsetVal = productId ? offset : undefined;
    
    query = `
      SELECT * FROM product_variants
      ${productId ? `WHERE product_id = ${productId}` : ''}
      ORDER BY created_at DESC
      LIMIT ${limitVal ?? 50} OFFSET ${offsetVal ?? 0}
    `;
    
    rows = await db`${query}`;
  } else {
    query = `SELECT * FROM product_variants ORDER BY created_at DESC LIMIT 48`;
    rows = await db`${query}`;
  }
  
  return {
    rows: rows.map(parseVariant),
    total,
  };
}

type Variant = {
  id: string;
  product_id: string;
  size?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  stock: number;
  price?: number | null;
  created_at: string;
};

function parseVariant(row: any): Variant {
  return {
    id: row.id as string,
    product_id: row.product_id as string,
    size: row.size as string | null,
    color_name: row.color_name as string | null,
    color_hex: row.color_hex as string | null,
    stock: row.stock as number,
    price: row.price ? Number(row.price) : null,
    created_at: row.created_at as string,
  };
}

/**
 * Get all active variants for a product
 */
export async function getActiveVariants(productId: string): Promise<Variant[]> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM product_variants WHERE product_id = ${productId}`;
  
  return rows.map(parseVariant);
}

/**
 * Check if variant exists
 */
export async function variantExists(variantId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM product_variants WHERE id = ${variantId} LIMIT 1`;
  return !!result;
}

/**
 * Get variants stock total for a product
 */
export async function getProductTotalVariantStock(productId: string): Promise<number> {
  const db = getDatabase();
  
  const result = await db`SELECT COALESCE(SUM(stock), 0) as total FROM product_variants WHERE product_id = ${productId}`;
  
  return typeof result.total === "number" ? Number(result.total) : 0;
}