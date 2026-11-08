import "server-only";
import { getDatabase } from "./d1/client";
import { AppUserSchema, type AppUser } from "@/schemas/user";

/**
 * Get current ownership for a product item
 */
export async function getCurrentOwnership(productItemId: string): Promise<{
  user_id: string;
  user?: AppUser | null;
  started_at: string;
  acquisition_type: string;
} | null> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT o.id, o.product_item_id, o.user_id, o.started_at, o.acquisition_type, u.email, u.display_name as user_display_name
    FROM ownerships o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.product_item_id = ${productItemId} AND o.is_current = 1
    LIMIT 1
  `;
  
  if (!rows[0]) return null;
  
  try {
    const parsedUser = rows[0].user_display_name ? 
      AppUserSchema.parse(rows[0] as unknown as any) : null;
    
    return {
      user_id: rows[0].user_id,
      user: rows[0].email ? parsedUser : null,
      started_at: rows[0].started_at,
      acquisition_type: rows[0].acquisition_type,
    };
  } catch (error) {
    throw new Error(`Invalid ownership data for ${productItemId}: ${(error as Error).message}`);
  }
}

/**
 * Get all ownership history for a product item
 */
export async function getOwnershipHistory(productItemId: string): Promise<Ownership[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT o.*, u.email as user_email, u.display_name as user_display_name
    FROM ownerships o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.product_item_id = ${productItemId}
    ORDER BY o.started_at ASC
  `;
  
  return rows.map(row => ({
    id: row.id,
    product_item_id: row.product_item_id,
    user_id: row.user_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    acquisition_type: row.acquisition_type,
    is_current: row.is_current === 1 ? true : false,
  }));
}

/**
 * Create a new ownership record (admin only)
 */
export async function createOwnership({
  productItemId,
  userId,
  startedAt,
  acquisitionType,
}: {
  productItemId: string;
  userId: string;
  startedAt?: string;
  acquisitionType: "original_purchase" | "resale" | "transfer" | "gift" | "admin_assignment";
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    INSERT INTO ownerships (product_item_id, user_id, started_at, acquisition_type, is_current)
    VALUES (${productItemId}, ${userId}, ${startedAt ?? "datetime('now')"}, ${acquisitionType}, 0)
  `;
}

/**
 * Activate an ownership record as current
 */
export async function activateOwnership(productItemId: string, userId: string): Promise<void> {
  const db = getDatabase();
  
  // Deactivate any other active ownership for this item
  await db`UPDATE ownerships SET is_current = 0 WHERE product_item_id = ${productItemId} AND is_current = 1`;
  
  // Activate the new ownership
  await db`
    INSERT OR IGNORE INTO ownerships (product_item_id, user_id, started_at, acquisition_type, is_current)
    VALUES (${productItemId}, ${userId}, datetime('now'), 'admin_assignment', 1)
  `;
}

/**
 * Deactivate an ownership record
 */
export async function deactivateOwnership(ownershipId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE ownerships SET is_current = 0 WHERE id = ${ownershipId}`;
}

/**
 * Get all product items with their current owner info
 */
export async function getProductItemsWithOwner(limit: number = 10): Promise<ProductItemWithOwner[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      pi.id, pi.product_id, pi.serial_number, pi.status,
      nfc_tags.chip_uid as chip_uid,
      o.user_id as owner_id, u.email as owner_email, u.display_name as owner_display_name
    FROM product_items pi
    LEFT JOIN nfc_tags ON pi.id = nfc_tags.product_item_id
    LEFT JOIN ownerships o ON pi.id = o.product_item_id AND o.is_current = 1
    LEFT JOIN users u ON o.user_id = u.id
    LIMIT ${limit}
  `;
  
  return rows.map(row => ({
    id: row.id,
    product_id: row.product_id,
    serial_number: row.serial_number,
    status: row.status,
    chip_uid: row.chip_uid,
    owner_id: row.owner_id,
    owner_email: row.owner_email,
    owner_display_name: row.owner_display_name,
  }));
}

/**
 * Check if a product item has an active NFC tag
 */
export async function hasActiveNfcTag(productItemId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM nfc_tags WHERE product_item_id = ${productItemId} LIMIT 1`;
  return !!result;
}

/**
 * Verify NFC tag UID for a product item
 */
export async function verifyNfcTag({
  productItemId,
  chipUid,
}: {
  productItemId: string;
  chipUid: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  const [result] = await db`SELECT 1 FROM nfc_tags 
    WHERE product_item_id = ${productItemId} 
    AND (chip_uid IS NULL OR chip_uid = ${chipUid}) LIMIT 1`;
  
  return !!result;
}

/**
 * Associate an NFC tag UID with a product item
 */
export async function associateNfcTag({
  productItemId,
  chipUid,
}: {
  productItemId: string;
  chipUid: string;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    UPDATE nfc_tags
    SET chip_uid = ${chipUid}, provisioning_status = 'provisioned'
    WHERE product_item_id = ${productItemId}
  `;
}

/**
 * Mark NFC tag as verified by customer
 */
export async function verifyNfcTagByUser({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<{ chip_uid?: string; provisioning_status?: string } | null> {
  const db = getDatabase();
  
  // Get product item by serial number
  const [productItem] = await db`SELECT * FROM product_items WHERE serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  // Verify NFC tag association
  const [nfcTag] = await db`SELECT chip_uid, provisioning_status FROM nfc_tags 
    WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  if (nfcTag) {
    await db`UPDATE nfc_tags SET last_verified_at = datetime('now'), provisioning_status = 'qa_passed' 
      WHERE product_item_id = ${productItem.id}`;
  }
  
  return { chip_uid: nfcTag?.chip_uid, provisioning_status: nfcTag?.provisioning_status };
}

/**
 * Update NFC tag status
 */
export async function updateNfcTagStatus({
  productId,
  serialNumber,
  provisioningStatus,
}: {
  productId: string;
  serialNumber: string;
  provisioningStatus: "unassigned" | "testing" | "provisioned" | "qa_passed" | "retired";
}): Promise<void> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return;
  
  await db`UPDATE nfc_tags SET provisioning_status = ${provisioningStatus} 
    WHERE product_item_id = ${productItem.id}`;
}

type Ownership = {
  id: string;
  product_item_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  acquisition_type: string;
  is_current: boolean;
};

type ProductItemWithOwner = {
  id: string;
  product_id: string;
  serial_number: string;
  status: string;
  chip_uid?: string | null;
  owner_id?: string | null;
  owner_email?: string | null;
  owner_display_name?: string | null;
};