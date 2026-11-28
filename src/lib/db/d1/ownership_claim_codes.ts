import "server-only";
import { getDatabase } from "./client";
import { hashOwnershipClaimCode } from "@/lib/nfc/claims";

export type GeneratedClaimCode = {
  id: string;
  product_item_id: string;
  code: string;
  expires_at: string;
};

export async function generateClaimCode(
  productItemId: string,
  orderId?: string,
): Promise<GeneratedClaimCode> {
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  const code = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("").toUpperCase();
  const codeHash = await hashOwnershipClaimCode(code);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const db = getDatabase();

  const rows = await db`
    INSERT INTO ownership_claim_codes
      (id, product_item_id, code_hash, status, expires_at)
    SELECT ${id}, pi.id, ${codeHash}, 'active', ${expiresAt}
    FROM product_items pi
    WHERE pi.id = ${productItemId}
      AND pi.status != 'retired'
      AND EXISTS (
        SELECT 1
        FROM nfc_tags nt
        WHERE nt.product_item_id = pi.id
          AND nt.chip_uid IS NOT NULL
          AND nt.provisioning_status IN ('provisioned', 'qa_passed')
      )
      AND EXISTS (
        SELECT 1
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN payments p ON p.order_id = o.id AND p.status = 'approved'
        WHERE oi.product_item_id = pi.id
          AND (${orderId ?? null} IS NULL OR o.id = ${orderId ?? null})
          AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
          AND o.payment_status = 'approved'
      )
      AND NOT EXISTS (
        SELECT 1 FROM ownerships existing
        WHERE existing.product_item_id = pi.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM ownership_claim_codes active
        WHERE active.product_item_id = pi.id
          AND active.status = 'active'
          AND datetime(active.expires_at) > datetime('now')
      )
    RETURNING id
  `;

  if (rows.length !== 1) {
    throw new Error(
      "A claim code can only be issued for an unclaimed NFC-linked item from an approved order.",
    );
  }

  return { id, product_item_id: productItemId, code, expires_at: expiresAt };
}

export async function invalidateClaimCode(codeId: string): Promise<void> {
  const db = getDatabase();
  await db`
    UPDATE ownership_claim_codes
    SET status = 'invalidated', updated_at = datetime('now')
    WHERE id = ${codeId} AND status = 'active'
  `;
}
