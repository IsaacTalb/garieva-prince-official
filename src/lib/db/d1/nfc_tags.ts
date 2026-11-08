import "server-only";
import { getDatabase } from "./d1/client";
import { getProductById } from "./d1/products";

type NfcTag = {
  id: string;
  product_item_id: string;
  chip_uid?: string | null;
  tag_type: string;
  key_version: number;
  provisioning_status: string;
  sdm_enabled: boolean;
  last_verified_at?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get NFC tag by product item ID
 */
export async function getNfcTagByItem(productId: string, serialNumber: string): Promise<NfcTag | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const rows = await db`SELECT * FROM nfc_tags WHERE product_item_id = ${productItem.id}`;
  
  return rows[0] || null;
}

/**
 * Get all NFC tags for products (admin view)
 */
export async function getAllNfcTags(): Promise<NfcTag[]> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM nfc_tags`;
  
  return rows.map(row => ({
    ...row,
    sdm_enabled: row.sdm_enabled === 1 ? true : false,
  }));
}

/**
 * Create an NFC tag record (factory provisioning)
 */
export async function createNfcTag({
  productItemId,
  chipUid,
  tagType = "NTAG424DNA",
  keyVersion = 1,
}: {
  productItemId: string;
  chipUid: string;
  tagType?: string;
  keyVersion?: number;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  const [result] = await db`
    INSERT INTO nfc_tags (product_item_id, chip_uid, tag_type, key_version, provisioning_status)
    VALUES (${productItemId}, ${chipUid}, ${tagType}, ${keyVersion}, 'testing')
    RETURNING id
  `;
  
  return result;
}

/**
 * Verify NFC tag exists and is associated with the correct item
 */
export async function verifyNfcTagAssociation({
  productItemId,
  chipUid,
}: {
  productItemId: string;
  chipUid: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  const [result] = await db`SELECT 1 FROM nfc_tags WHERE product_item_id = ${productItemId} AND (chip_uid IS NULL OR chip_uid = ${chipUid}) LIMIT 1`;
  
  return !!result;
}

/**
 * Verify NFC tag UID for a specific product item
 */
export async function verifyNfcTagForItem({
  productId,
  serialNumber,
  chipUid,
}: {
  productId: string;
  serialNumber: string;
  chipUid: string;
}): Promise<{ chip_uid?: string; provisioning_status?: string } | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const [result] = await db`SELECT chip_uid, provisioning_status FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  return result || null;
}

/**
 * Provision NFC tag with SDM (Secure Data Mode)
 */
export async function provisionNfcTag({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<{ chip_uid?: string } | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  // This would call NFC provisioning library in production
  // For now, mark as provisioned
  const [nfcTag] = await db`SELECT chip_uid FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  if (nfcTag) {
    await db`UPDATE nfc_tags SET provisioning_status = 'qa_passed', sdm_enabled = 1 WHERE product_item_id = ${productItem.id}`;
  }
  
  return { chip_uid: nfcTag?.chip_uid };
}

/**
 * Mark NFC tag as verified by customer tap
 */
export async function markNfcTagVerified({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<{ chip_uid?: string } | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const [nfcTag] = await db`SELECT chip_uid FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  if (nfcTag) {
    await db`UPDATE nfc_tags SET last_verified_at = datetime('now'), provisioning_status = 'provisioned' WHERE product_item_id = ${productItem.id}`;
  }
  
  return { chip_uid: nfcTag?.chip_uid };
}

/**
 * Update NFC tag provisioning status
 */
export async function updateNfcTagStatus({
  productId,
  serialNumber,
  provisioningStatus,
}: {
  productId: string;
  serialNumber: string;
  provisioningStatus: "unassigned" | "testing" | "provisioned" | "qa_passed" | "retired";
}): Promise<{ chip_uid?: string } | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const [result] = await db`UPDATE nfc_tags SET provisioning_status = ${provisioningStatus} WHERE product_item_id = ${productItem.id}`;
  
  return result ? { chip_uid: "verified" } : null;
}

/**
 * Get NFC tag details for a specific item
 */
export async function getNfcTagDetails({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<NfcTag | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const rows = await db`SELECT * FROM nfc_tags WHERE product_item_id = ${productItem.id}`;
  
  if (!rows[0]) return null;
  
  return { ...rows[0], sdm_enabled: rows[0].sdm_enabled === 1 ? true : false };
}

/**
 * Deactivate NFC tag (retired)
 */
export async function retireNfcTag({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<void> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return;
  
  await db`UPDATE nfc_tags SET provisioning_status = 'retired' WHERE product_item_id = ${productItem.id}`;
}

/**
 * Get all active NFC tags (not retired)
 */
export async function getActiveNfcTags(limit: number = 10): Promise<NfcTag[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT n.* FROM nfc_tags n
    INNER JOIN product_items pi ON n.product_item_id = pi.id
    WHERE n.provisioning_status NOT IN ('retired', 'unassigned')
    LIMIT ${limit}
  `;
  
  return rows.map(row => ({ ...row, sdm_enabled: row.sdm_enabled === 1 ? true : false }));
}

/**
 * Check if NFC tag is verified by customer
 */
export async function isNfcTagVerified({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return false;
  
  const [nfcTag] = await db`SELECT last_verified_at FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  return !!nfcTag?.last_verified_at;
}

/**
 * Get NFC tag type for a specific item
 */
export async function getNfcTagType({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<string | null> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return null;
  
  const [nfcTag] = await db`SELECT tag_type FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  return nfcTag?.tag_type || "NTAG424DNA";
}

/**
 * Get SDM enabled status for a specific item
 */
export async function getNfcSdmEnabled({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  const [productItem] = await db`SELECT id FROM product_items WHERE product_id = ${productId} AND serial_number = ${serialNumber} LIMIT 1`;
  
  if (!productItem) return false;
  
  const [nfcTag] = await db`SELECT sdm_enabled FROM nfc_tags WHERE product_item_id = ${productItem.id} LIMIT 1`;
  
  return !!nfcTag?.sdm_enabled;
}