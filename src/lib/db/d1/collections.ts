import "server-only";
import { getDatabase } from "./d1/client";

type CollectionData = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

/**
 * Collection Repository - D1-backed collections management
 */

/**
 * Get collection by ID
 */
export async function getCollectionById(collectionId: string): Promise<Collection | null> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM collections WHERE id = ${collectionId}`;
  
  if (!rows[0]) return null;
  
  try {
    return parseCollection(rows[0]);
  } catch (error) {
    throw new Error(`Invalid collection data for ${collectionId}: ${(error as Error).message}`);
  }
}

/**
 * Get collection by slug
 */
export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM collections WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1`;
  
  if (!rows[0]) return null;
  
  try {
    return parseCollection(rows[0]);
  } catch (error) {
    throw new Error(`Invalid collection data for slug ${slug}: ${(error as Error).message}`);
  }
}

/**
 * Create a new collection
 */
export async function createCollection({
  name,
  slug,
  description = "",
  status = "draft",
}: CollectionData): Promise<Collection> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO collections (id, name, slug, description, status, created_at, updated_at)
      VALUES (${generateCollectionId()}, ${name}, ${slug}, ${description}, ${status}, datetime('now'), datetime('now'))
      RETURNING *
    `;
    
    return parseCollection(result);
  } catch (error) {
    throw new Error(`Failed to create collection: ${(error as Error).message}`);
  }
}

/**
 * Update a collection (partial update)
 */
export async function updateCollection({
  collectionId,
  name,
  slug,
  description,
  status,
}: {
  collectionId: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  status?: "draft" | "published" | "archived" | null;
}): Promise<Collection | null> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      UPDATE collections
      SET name = ${name ?? "null"}, 
          slug = ${slug ?? "null"}, 
          description = ${description ?? "null"},
          status = ${status ?? "null"}
      WHERE id = ${collectionId}
      RETURNING *
    `;
    
    if (!result) return null;
    
    return parseCollection(result);
  } catch (error) {
    throw new Error(`Failed to update collection: ${(error as Error).message}`);
  }
}

/**
 * Delete a collection (soft delete)
 */
export async function softDeleteCollection(collectionId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE collections SET deleted_at = datetime('now') WHERE id = ${collectionId}`;
}

/**
 * Get all collections with optional pagination
 */
export async function getCollections(options?: {
  status?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: Collection[]; total: number }> {
  const db = getDatabase();
  
  let query = `SELECT COUNT(*) as total FROM collections WHERE deleted_at IS NULL`;
  if (options?.status) {
    query += ` AND status = ${options.status}`;
  }
  
  const [countResult] = await db`${query}`;
  const total = typeof countResult.total === "number" ? Number(countResult.total) : 0;
  
  let rows: any[] = [];
  
  if (options?.limit || options?.offset) {
    query = `
      SELECT * FROM collections
      WHERE deleted_at IS NULL ${options.status ? `AND status = ${options.status}` : ''}
      ORDER BY created_at DESC
      LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}
    `;
    
    rows = await db`${query}`;
  } else {
    query = `SELECT * FROM collections WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 48`;
    rows = await db`${query}`;
  }
  
  return {
    rows: rows.map(parseCollection),
    total,
  };
}

type CollectionItem = {
  collection_id: string;
  product_id: string;
  position: number;
};

/**
 * Get collection products with pagination
 */
export async function getCollectionProducts({
  collectionId,
  limit = 48,
}: {
  collectionId: string;
  limit?: number;
}): Promise<{ rows: CollectionProduct[]; total: number }> {
  const db = getDatabase();
  
  // First get the product count
  const countResult = await db`
    SELECT COUNT(*) as c FROM collection_products cp
    INNER JOIN products p ON cp.product_id = p.id
    WHERE cp.collection_id = ${collectionId} AND p.deleted_at IS NULL AND p.status = 'published'
    LIMIT ${limit}
  `;
  
  const total = typeof countResult.c === "number" ? Number(countResult.c) : 0;
  
  // Get actual products with position info
  const rows = await db`
    SELECT 
      cp.collection_id, cp.product_id, cp.position,
      p.id as product_id, p.name as product_name, p.slug as product_slug,
      m.object_key as image_key, m.alt_text as image_alt
    FROM collection_products cp
    INNER JOIN products p ON cp.product_id = p.id
    LEFT JOIN (
      SELECT object_key, alt_text FROM product_media 
      WHERE product_id IN (SELECT product_id FROM collection_products WHERE collection_id = ${collectionId})
      ORDER BY position, id LIMIT 1
    ) m ON TRUE
    WHERE p.deleted_at IS NULL AND p.status = 'published'
    AND cp.collection_id = ${collectionId}
    ORDER BY cp.position ASC, p.created_at DESC
    LIMIT ${limit}
  `;
  
  return {
    rows: rows.map((row) => ({
      collection_id: row.collection_id as string,
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
 * Create a collection product relation
 */
export async function createCollectionProduct({
  collectionId,
  productId,
  position,
}: {
  collectionId: string;
  productId: string;
  position?: number;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO collection_products (collection_id, product_id, position)
      VALUES (${collectionId}, ${productId}, ${position ?? 0})
      RETURNING id
    `;
    
    return result;
  } catch (error) {
    // Handle duplicate constraint gracefully
    return { id: generateCollectionProductId(collectionId, productId) };
  }
}

/**
 * Delete a collection product relation
 */
export async function deleteCollectionProduct({
  collectionId,
  productId,
}: {
  collectionId: string;
  productId: string;
}): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM collection_products WHERE collection_id = ${collectionId} AND product_id = ${productId}`;
}

/**
 * Update collection products position
 */
export async function updateCollectionProductsPositions({
  collectionId,
  positions, // Array of { productId, position }
}: {
  collectionId: string;
  positions: Array<{ productId: string; position: number }>;
}): Promise<void> {
  const db = getDatabase();
  
  for (const pos of positions) {
    await db`
      UPDATE collection_products
      SET position = ${pos.position}
      WHERE collection_id = ${collectionId} AND product_id = ${pos.productId}
    `;
  }
}

function parseCollection(row: any): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    status: row.status as "draft" | "published" | "archived",
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

type CollectionProduct = {
  collection_id: string;
  product_id: string;
  position: number;
};

/**
 * Get all published collections for admin view
 */
export async function getPublishedCollections(): Promise<Collection[]> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM collections WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`;
  
  return rows.map(parseCollection);
}

/**
 * Archive a collection
 */
export async function archiveCollection(collectionId: string): Promise<void> {
  await updateCollection({ collectionId, status: "archived" });
}

/**
 * Publish a collection
 */
export async function publishCollection(collectionId: string): Promise<Collection | null> {
  return await updateCollection({ collectionId, status: "published" });
}

/**
 * Unpublish a collection (draft)
 */
export async function unpublishCollection(collectionId: string): Promise<Collection | null> {
  return await updateCollection({ collectionId, status: "draft" });
}