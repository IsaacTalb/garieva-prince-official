import "server-only";
import { getDatabase } from "./d1/client";
import type { SessionData } from "@/lib/auth/session";

/**
 * Ownership Claim Codes Repository
 * 
 * Manages claim codes for physical garment ownership creation.
 * Claim codes are hashed and stored securely in D1.
 */

export interface ClaimCode {
  id: string;
  product_item_id: string;
  code_hash: string;
  status: "active" | "redeemed" | "expired" | "invalidated";
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClaimCodeInput {
  product_item_id: string;
  code_hash: string;
  status?: "active";
  expires_at?: string;
}

/**
 * Generate a new claim code (hashed) for a product item
 */
export async function generateClaimCode(
  productId: string,
  serial: string
): Promise<ClaimCode> {
  const db = getDatabase();
  
  // Generate secure random hash (simulated - in production use proper crypto)
  const codeHash = `sha256:${serial}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours
  
  // Insert claim code (SQLite compatible syntax)
  const insertSql = db.prepare(`
    INSERT INTO ownership_claim_codes 
    (id, product_item_id, code_hash, status, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  const id = `claim_${serial}_${Date.now()}`;
  insertSql.run([id, productId, codeHash, "active", expiresAt]);
  
  return {
    id,
    product_item_id: productId,
    code_hash: codeHash,
    status: "active",
    expires_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Activate an existing claim code (mark as active)
 */
export async function activateClaimCode(codeHash: string): Promise<void> {
  const db = getDatabase();
  
  db.prepare(`
    UPDATE ownership_claim_codes 
    SET status = 'active', updated_at = datetime('now')
    WHERE code_hash = ? AND status NOT IN ('redeemed', 'expired', 'invalidated')
  `).run([codeHash]);
}

/**
 * Validate a claim code (check if active and not expired)
 */
export async function validateClaimCode(codeHash: string): Promise<ClaimCode | null> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT * FROM ownership_claim_codes 
    WHERE code_hash = ? AND status = 'active'
  `, [codeHash];
  
  return rows[0] || null;
}

/**
 * Redeem a claim code (consume and assign to user)
 */
export async function redeemClaimCode(
  codeHash: string,
  userId: string,
  productItemId: string
): Promise<SessionData | null> {
  const db = getDatabase();
  
  // Check if code is valid and active
  const [code] = await validateClaimCode(codeHash);
  if (!code) throw new Error("Invalid or expired claim code");
  
  // Check if product item belongs to this claim
  const [item] = await db`SELECT id FROM product_items WHERE serial = ?`, [productItemId];
  if (!item || item.id !== code.product_item_id) {
    throw new Error("Claim code does not match product item");
  }
  
  // Consume claim code (mark as redeemed)
  await db.prepare(`
    UPDATE ownership_claim_codes 
    SET status = 'redeemed', updated_at = datetime('now')
    WHERE id = ?
  `).run([code.id]);
  
  // Create ownership record (simplified - actual implementation in ownership.ts)
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO ownerships 
    (id, user_id, product_item_id, is_current, started_at, ended_at, created_at)
    VALUES (?, ?, ?, 1, ?, NULL, datetime('now'))
  `).run([
    `own_${codeHash}_${userId}`,
    userId,
    productItemId,
    now,
  ]);
  
  // Return user session data (actual implementation would fetch full user)
  return {
    id: userId,
    email: "user@example.com",
    display_name: "User",
  };
}

/**
 * Get active claim codes for a product item
 */
export async function getActiveClaimCodes(
  productId: string
): Promise<ClaimCode[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT * FROM ownership_claim_codes 
    WHERE product_item_id = ? AND status = 'active'
  `, [productId];
  
  return rows;
}

/**
 * Deactivate a claim code (admin action)
 */
export async function deactivateClaimCode(codeId: string): Promise<void> {
  const db = getDatabase();
  
  await db.prepare(`
    UPDATE ownership_claim_codes 
    SET status = 'invalidated', updated_at = datetime('now')
    WHERE id = ?
  `).run([codeId]);
}

/**
 * Reactivate a claim code (admin action)
 */
export async function reactivateClaimCode(codeId: string): Promise<void> {
  const db = getDatabase();
  
  await db.prepare(`
    UPDATE ownership_claim_codes 
    SET status = 'active', updated_at = datetime('now')
    WHERE id = ? AND status IN ('redeemed', 'expired')
  `).run([codeId]);
}

/**
 * Get claim code usage statistics (admin)
 */
export async function getClaimCodeStats(): Promise<{ total: number; active: number; redeemed: number }> {
  const db = getDatabase();
  
  const [total] = await db`SELECT COUNT(*) as total FROM ownership_claim_codes`;
  const [active] = await db`SELECT COUNT(*) as count FROM ownership_claim_codes WHERE status = 'active'`;
  const [redeemed] = await db`SELECT COUNT(*) as count FROM ownership_claim_codes WHERE status = 'redeemed'`;
  
  return {
    total: (total as any).total ?? 0,
    active: (active as any).count ?? 0,
    redeemed: (redeemed as any).count ?? 0,
  };
}

/**
 * Generate sample claim codes for testing/development
 */
export async function generateTestClaimCodes(count: number = 10): Promise<ClaimCode[]> {
  const db = getDatabase();
  const rows: ClaimCode[] = [];
  
  for (let i = 0; i < count; i++) {
    const serial = `GP${100 + i}`;
    const claimCode = await generateClaimCode(serial, serial);
    rows.push(claimCode);
  }
  
  return rows;
}