import "server-only";
import { getDatabase } from "./d1/client";
import { uploadMedia, deleteObjectFromR2 } from "@/lib/r2/media";

export type MediaItem = {
  product_id: string;
  object_key: string;
  alt_text?: string | null;
  position?: number | null;
  created_at?: string;
};

type CreateMediaInput = {
  productId: string;
  contentType: string;
  content: ArrayBuffer;
  altText?: string | null;
  position?: number | null;
};

/**
 * Get media by product ID (ordered by position, then by creation time)
 */
export async function getMediaByProduct(productId: string): Promise<MediaItem[]> {
  const db = getDatabase();
  
  // Use lateral join to get first image per product automatically
  const rows = await db`
    SELECT 
      pm.product_id,
      pm.object_key,
      pm.alt_text,
      pm.position,
      pm.created_at
    FROM product_media pm
    LEFT JOIN (
      SELECT product_id, MIN(id) as min_id
      FROM product_media
      WHERE product_id = ${productId}
      GROUP BY product_id
    ) first_image ON pm.id = first_image.min_id
    WHERE pm.product_id = ${productId}
    ORDER BY pm.position, pm.created_at
  `;
  
  return rows.map(row => ({
    product_id: row.product_id,
    object_key: row.object_key,
    alt_text: row.alt_text ?? null,
    position: row.position ?? null,
    created_at: row.created_at,
  }));
}

/**
 * Get first image for a product (most commonly used)
 */
export async function getFirstMediaByProduct(productId: string): Promise<MediaItem | null> {
  const db = getDatabase();
  const [first] = await db`
    SELECT 
      pm.product_id,
      pm.object_key,
      pm.alt_text,
      pm.position,
      pm.created_at
    FROM product_media pm
    WHERE pm.product_id = ${productId}
    ORDER BY COALESCE(pm.position, 0), pm.created_at
    LIMIT 1
  `;
  
  return first ? ({
    product_id: first.product_id,
    object_key: first.object_key,
    alt_text: first.alt_text ?? null,
    position: first.position ?? null,
    created_at: first.created_at,
  }) : null;
}

/**
 * Upload new image for a product via R2
 */
export async function uploadProductMedia({
  productId,
  contentType,
  content,
  altText,
  position,
}: CreateMediaInput): Promise<{ url: string; key: string }> {
  const db = getDatabase();
  
  // Generate unique object key
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const objectKey = `garieva-prince/media/products/${productId}/${timestamp}-${randomSuffix}.img`;
  
  // Upload to R2
  const uploadResult = await uploadMedia({
    objectKey,
    contentType,
    content,
    isPrivate: false, // Product media is public
  });
  
  if (!uploadResult.url) {
    throw new Error("Failed to get URL from R2");
  }
  
  // Store reference in D1
  try {
    await db`
      INSERT INTO product_media (product_id, object_key, alt_text, position, created_at)
      VALUES (${productId}, ${objectKey}, ${altText}, ${position}, datetime('now'))
      ON CONFLICT(product_id, object_key) DO UPDATE SET
        alt_text = excluded.alt_text,
        position = excluded.position
    `;
  } catch (error) {
    // If duplicate, that's ok - might be idempotent upload
  }
  
  return {
    url: uploadResult.url,
    key: objectKey,
  };
}

/**
 * Delete media by product ID and object key
 */
export async function deleteProductMedia(productId: string, objectKey: string): Promise<void> {
  const db = getDatabase();
  
  // Delete from R2
  if (await deleteObjectFromR2(objectKey)) {
    await db`DELETE FROM product_media WHERE product_id = ${productId} AND object_key = ${objectKey}`;
  }
}

/**
 * Delete all media for a product
 */
export async function deleteProductAllMedia(productId: string): Promise<void> {
  const db = getDatabase();
  
  // Get all media keys for this product
  const rows = await db`SELECT object_key FROM product_media WHERE product_id = ${productId}`;
  
  // Delete from R2 and database
  for (const row of rows) {
    if (await deleteObjectFromR2(row.object_key)) {
      await db`DELETE FROM product_media WHERE product_id = ${productId} AND object_key = ${row.object_key}`;
    }
  }
}

/**
 * Update media alt text for a specific image
 */
export async function updateMediaAltText({
  productId,
  objectKey,
  altText,
}: {
  productId: string;
  objectKey: string;
  altText: string | null;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    UPDATE product_media 
    SET alt_text = ${altText}
    WHERE product_id = ${productId} AND object_key = ${objectKey}
  `;
}

/**
 * Get count of images for a product (cached)
 */
export async function getProductMediaCount(productId: string): Promise<number> {
  const db = getDatabase();
  const [result] = await db`SELECT COUNT(*) as count FROM product_media WHERE product_id = ${productId}`;
  return result?.count ?? 0;
}

/**
 * Get product image URLs (public)
 */
export async function getProductPublicImageUrls(productId: string): Promise<string[]> {
  const db = getDatabase();
  
  // Get first N images (typically 3-6 for product gallery)
  const rows = await db`
    SELECT object_key FROM product_media 
    WHERE product_id = ${productId}
    ORDER BY COALESCE(position, 0), created_at DESC
    LIMIT 10
  `;
  
  return rows.map(row => {
    const base = process.env.R2_PUBLIC_BASE_URL;
    if (!base) return null;
    
    // Reconstruct public URL from object key
    const objectKey = row.object_key.replace(/^\//, "");
    return `${base.replace(/\/$/, "")}/${objectKey}`;
  }).filter(Boolean) as string[];
}