import "server-only";
import { getDatabase } from "./d1/client";

type DropData = {
  id?: string;
  collection_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "scheduled" | "active" | "closed";
  opens_at?: string | null;
  closes_at?: string | null;
};

type Drop = {
  id: string;
  collection_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "scheduled" | "active" | "closed";
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Drop Repository - D1-backed drops management
 */

/**
 * Get drop by ID
 */
export async function getDropById(dropId: string): Promise<Drop | null> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM drops WHERE id = ${dropId}`;
  
  if (!rows[0]) return null;
  
  try {
    return parseDrop(rows[0]);
  } catch (error) {
    throw new Error(`Invalid drop data for ${dropId}: ${(error as Error).message}`);
  }
}

/**
 * Get drop by slug
 */
export async function getDropBySlug(slug: string): Promise<Drop | null> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM drops WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1`;
  
  if (!rows[0]) return null;
  
  try {
    return parseDrop(rows[0]);
  } catch (error) {
    throw new Error(`Invalid drop data for slug ${slug}: ${(error as Error).message}`);
  }
}

/**
 * Create a new drop
 */
export async function createDrop({
  collection_id,
  name,
  slug,
  description = "",
  status = "draft",
  opens_at,
  closes_at,
}: DropData): Promise<Drop> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO drops (id, collection_id, name, slug, description, status, opens_at, closes_at, created_at, updated_at)
      VALUES (${generateDropId()}, ${collection_id}, ${name}, ${slug}, ${description}, ${status}, 
              ${opens_at ?? "null"}, ${closes_at ?? "null"}, datetime('now'), datetime('now'))
      RETURNING *
    `;
    
    return parseDrop(result);
  } catch (error) {
    throw new Error(`Failed to create drop: ${(error as Error).message}`);
  }
}

/**
 * Update a drop (partial update)
 */
export async function updateDrop({
  dropId,
  collection_id,
  name,
  slug,
  description,
  status,
  opens_at,
  closes_at,
}: {
  dropId: string;
  collection_id?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  status?: "draft" | "scheduled" | "active" | "closed" | null;
  opens_at?: string | null;
  closes_at?: string | null;
}): Promise<Drop | null> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      UPDATE drops
      SET collection_id = ${collection_id ?? "null"}, 
          name = ${name ?? "null"}, 
          slug = ${slug ?? "null"}, 
          description = ${description ?? "null"},
          status = ${status ?? "null"},
          opens_at = ${opens_at ?? "null"},
          closes_at = ${closes_at ?? "null"}
      WHERE id = ${dropId}
      RETURNING *
    `;
    
    if (!result) return null;
    
    return parseDrop(result);
  } catch (error) {
    throw new Error(`Failed to update drop: ${(error as Error).message}`);
  }
}

/**
 * Delete a drop (soft delete)
 */
export async function softDeleteDrop(dropId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE drops SET deleted_at = datetime('now') WHERE id = ${dropId}`;
}

/**
 * Get all drops with optional pagination and filters
 */
export async function getDrops(options?: {
  status?: string | null;
  collection_id?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: Drop[]; total: number }> {
  const db = getDatabase();
  
  let query = `SELECT COUNT(*) as total FROM drops WHERE deleted_at IS NULL`;
  if (options?.status) {
    query += ` AND status = ${options.status}`;
  }
  if (options?.collection_id) {
    query += ` AND collection_id = ${options.collection_id}`;
  }
  
  const [countResult] = await db`${query}`;
  const total = typeof countResult.total === "number" ? Number(countResult.total) : 0;
  
  let rows: any[] = [];
  
  if (options?.limit || options?.offset) {
    query = `
      SELECT * FROM drops
      WHERE deleted_at IS NULL 
        ${options.status ? `AND status = ${options.status}` : ''}
        ${options.collection_id ? `AND collection_id = ${options.collection_id}` : ''}
      ORDER BY created_at DESC
      LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}
    `;
    
    rows = await db`${query}`;
  } else {
    query = `SELECT * FROM drops WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 48`;
    rows = await db`${query}`;
  }
  
  return {
    rows: rows.map(parseDrop),
    total,
  };
}

/**
 * Get active drops (scheduled or active)
 */
export async function getActiveDrops(): Promise<Drop[]> {
  const db = getDatabase();
  
  const now = new Date().toISOString();
  
  const rows = await db`
    SELECT * FROM drops 
    WHERE deleted_at IS NULL 
      AND status IN ('scheduled', 'active')
      AND (opens_at IS NULL OR opens_at <= datetime('now'))
      AND (closes_at IS NULL OR closes_at >= datetime('now'))
    ORDER BY created_at DESC
    LIMIT 50
  `;
  
  return rows.map(parseDrop);
}

/**
 * Get scheduled drops (future)
 */
export async function getScheduledDrops(): Promise<Drop[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT * FROM drops 
    WHERE deleted_at IS NULL 
      AND status = 'scheduled'
      AND opens_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 50
  `;
  
  return rows.map(parseDrop);
}

/**
 * Get drop products with pagination
 */
export async function getDropProducts({
  dropId,
  limit = 48,
}: {
  dropId: string;
  limit?: number;
}): Promise<{ rows: DropProduct[]; total: number }> {
  const db = getDatabase();
  
  // First get the product count
  const countResult = await db`
    SELECT COUNT(*) as c FROM products p
    INNER JOIN drop_products dp ON p.id = dp.product_id
    WHERE dp.drop_id = ${dropId} AND p.deleted_at IS NULL AND p.status = 'published'
    LIMIT ${limit}
  `;
  
  const total = typeof countResult.c === "number" ? Number(countResult.c) : 0;
  
  // Get actual products
  const rows = await db`
    SELECT 
      dp.drop_id, dp.product_id, dp.position,
      p.id as product_id, p.name as product_name, p.slug as product_slug,
      m.object_key as image_key, m.alt_text as image_alt
    FROM drop_products dp
    INNER JOIN products p ON dp.product_id = p.id
    LEFT JOIN (
      SELECT object_key, alt_text FROM product_media 
      WHERE product_id IN (SELECT product_id FROM drop_products WHERE drop_id = ${dropId})
      ORDER BY position, id LIMIT 1
    ) m ON TRUE
    WHERE p.deleted_at IS NULL AND p.status = 'published'
    AND dp.drop_id = ${dropId}
    ORDER BY dp.position ASC, p.created_at DESC
    LIMIT ${limit}
  `;
  
  return {
    rows: rows.map((row) => ({
      drop_id: row.drop_id as string,
      product_id: row.product_id as string,
      position: row.position as number,
      product: {
        id: row.product_id as string,
        name: row.product_name as string,
        slug: row.product_slug as string,
        image_url: null, // Will be resolved in frontend
      },
      image_key: row.image_key,
      image_alt: row.image_alt,
    })),
    total,
  };
}

/**
 * Create a drop product relation
 */
export async function createDropProduct({
  dropId,
  productId,
  position,
}: {
  dropId: string;
  productId: string;
  position?: number;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO drop_products (drop_id, product_id, position)
      VALUES (${dropId}, ${productId}, ${position ?? 0})
      RETURNING id
    `;
    
    return result;
  } catch (error) {
    // Handle duplicate constraint gracefully
    return { id: generateDropProductId(dropId, productId) };
  }
}

/**
 * Delete a drop product relation
 */
export async function deleteDropProduct({
  dropId,
  productId,
}: {
  dropId: string;
  productId: string;
}): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM drop_products WHERE drop_id = ${dropId} AND product_id = ${productId}`;
}

type DropProduct = {
  drop_id: string;
  product_id: string;
  position: number;
};

/**
 * Update drop products positions
 */
export async function updateDropProductsPositions({
  dropId,
  positions, // Array of { productId, position }
}: {
  dropId: string;
  positions: Array<{ productId: string; position: number }>;
}): Promise<void> {
  const db = getDatabase();
  
  for (const pos of positions) {
    await db`
      UPDATE drop_products
      SET position = ${pos.position}
      WHERE drop_id = ${dropId} AND product_id = ${pos.productId}
    `;
  }
}

/**
 * Schedule a drop (auto-publish when opens_at reaches current time)
 */
export async function scheduleDrop(dropId: string, opensAt: string): Promise<Drop | null> {
  return await updateDrop({ dropId, status: "scheduled", opens_at: opensAt });
}

/**
 * Activate a drop (open now)
 */
export async function activateDrop(dropId: string): Promise<Drop | null> {
  return await updateDrop({ dropId, status: "active" });
}

/**
 * Close a drop
 */
export async function closeDrop(dropId: string): Promise<Drop | null> {
  return await updateDrop({ dropId, status: "closed" });
}

function parseDrop(row: any): Drop {
  return {
    id: row.id as string,
    collection_id: row.collection_id as string | null,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    status: row.status as "draft" | "scheduled" | "active" | "closed",
    opens_at: row.opens_at ? new Date(row.opens_at).toISOString() : null,
    closes_at: row.closes_at ? new Date(row.closes_at).toISOString() : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Archive a drop
 */
export async function archiveDrop(dropId: string): Promise<void> {
  await updateDrop({ dropId, status: "archived" });
}

/**
 * Publish a drop
 */
export async function publishDrop(dropId: string): Promise<Drop | null> {
  return await updateDrop({ dropId, status: "published" });
}

/**
 * Get all published drops for admin view
 */
export async function getPublishedDrops(): Promise<Drop[]> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM drops WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`;
  
  return rows.map(parseDrop);
}