import type { DatabaseBatchStatement } from "@/lib/db/d1/client";

type ClaimBatchDatabase = {
  batch(statements: DatabaseBatchStatement[]): Promise<number[]>;
};

export async function hashOwnershipClaimCode(code: string): Promise<string> {
  const pepper = process.env.AUTH_OTP_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("AUTH_OTP_PEPPER must be configured with at least 32 characters.");
  }

  const normalizedCode = code.replace(/[\s-]/g, "").toUpperCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${normalizedCode}:${pepper}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function claimOwnershipAtomically(
  database: ClaimBatchDatabase,
  input: {
    publicId: string;
    userId: string;
    codeHash: string;
    ownershipId: string;
  },
): Promise<boolean> {
  const itemEligibility = `
    EXISTS (
      SELECT 1
      FROM product_items pi
      JOIN nfc_tags nt ON nt.product_item_id = pi.id
      JOIN order_items oi ON oi.product_item_id = pi.id
      JOIN orders o ON o.id = oi.order_id
      JOIN payments p ON p.order_id = o.id AND p.status = 'approved'
      WHERE pi.id = ownership_claim_codes.product_item_id
        AND pi.public_id = ?
        AND pi.status != 'retired'
        AND nt.chip_uid IS NOT NULL
        AND nt.provisioning_status IN ('provisioned', 'qa_passed')
        AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
        AND o.payment_status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM ownerships existing
          WHERE existing.product_item_id = pi.id
        )
    )
  `;

  const changes = await database.batch([
    {
      query: `
        UPDATE ownership_claim_codes
        SET status = 'redeemed', updated_at = datetime('now')
        WHERE code_hash = ?
          AND status = 'active'
          AND datetime(expires_at) > datetime('now')
          AND ${itemEligibility}
      `,
      params: [input.codeHash, input.publicId],
    },
    {
      query: `
        INSERT INTO ownerships
          (id, product_item_id, user_id, started_at, acquisition_type, is_current)
        SELECT ?, codes.product_item_id, ?, datetime('now'), 'original_purchase', 1
        FROM ownership_claim_codes codes
        JOIN product_items pi ON pi.id = codes.product_item_id
        JOIN nfc_tags nt ON nt.product_item_id = pi.id
        JOIN order_items oi ON oi.product_item_id = pi.id
        JOIN orders o ON o.id = oi.order_id
        JOIN payments p ON p.order_id = o.id AND p.status = 'approved'
        WHERE codes.code_hash = ?
          AND codes.status = 'redeemed'
          AND pi.public_id = ?
          AND pi.status != 'retired'
          AND nt.chip_uid IS NOT NULL
          AND nt.provisioning_status IN ('provisioned', 'qa_passed')
          AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
          AND o.payment_status = 'approved'
          AND NOT EXISTS (
            SELECT 1 FROM ownerships existing
            WHERE existing.product_item_id = pi.id
          )
        LIMIT 1
      `,
      params: [input.ownershipId, input.userId, input.codeHash, input.publicId],
    },
    {
      query: `
        UPDATE product_items
        SET status = 'owned', updated_at = datetime('now')
        WHERE id = (
          SELECT product_item_id FROM ownerships
          WHERE id = ? AND user_id = ? AND is_current = 1
        )
      `,
      params: [input.ownershipId, input.userId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'ownership', product_item_id, 'ownership_claimed', ?
        FROM ownerships
        WHERE id = ? AND user_id = ? AND is_current = 1
      `,
      params: [
        crypto.randomUUID(),
        input.userId,
        JSON.stringify({ acquisition_type: "original_purchase" }),
        input.ownershipId,
        input.userId,
      ],
    },
  ]);

  return changes.every((changeCount) => changeCount === 1);
}
