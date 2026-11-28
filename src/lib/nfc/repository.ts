import "server-only";
import { getDatabase } from "@/lib/db/d1/client";
import type {
  NfcPassport,
  NfcClaimableItem,
  NfcVerificationTarget,
} from "./types";

function publicProfileUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function getNfcVerificationTarget(
  publicId: string,
): Promise<NfcVerificationTarget | null> {
  const db = getDatabase();
  const [row] = await db`
    SELECT
      pi.id AS product_item_id,
      pi.status AS item_status,
      nt.key_version,
      nt.provisioning_status,
      nt.sdm_enabled
    FROM product_items pi
    LEFT JOIN nfc_tags nt ON nt.product_item_id = pi.id
    WHERE pi.public_id = ${publicId}
    LIMIT 1
  `;
  if (!row) return null;
  return {
    productItemId: String(row.product_item_id),
    itemStatus: String(row.item_status),
    keyVersion: row.key_version == null ? null : Number(row.key_version),
    provisioningStatus:
      row.provisioning_status == null ? null : String(row.provisioning_status),
    sdmEnabled: Number(row.sdm_enabled) === 1,
  };
}

export async function recordVerifiedTapCounter(input: {
  productItemId: string;
  keyVersion: number;
  tapCounter: number;
}): Promise<boolean> {
  const db = getDatabase();
  const rows = await db`
    INSERT INTO nfc_verification_events
      (id, product_item_id, key_version, tap_counter)
    SELECT
      ${crypto.randomUUID()}, ${input.productItemId}, ${input.keyVersion}, ${input.tapCounter}
    WHERE NOT EXISTS (
      SELECT 1
      FROM nfc_verification_events
      WHERE product_item_id = ${input.productItemId}
        AND key_version = ${input.keyVersion}
        AND tap_counter >= ${input.tapCounter}
    )
    ON CONFLICT(product_item_id, key_version, tap_counter) DO NOTHING
    RETURNING id
  `;
  return rows.length === 1;
}

export async function getPublicNfcPassport(
  publicId: string,
): Promise<NfcPassport | null> {
  const db = getDatabase();
  const [item] = await db`
    SELECT
      pi.id AS product_item_id,
      pi.public_id,
      pi.serial_number,
      p.name AS product_name,
      pv.size,
      pv.color_name,
      owner.name AS owner_name,
      owner.username AS owner_username,
      CASE WHEN owner.show_avatar_publicly = 1 THEN owner.avatar_url END AS owner_avatar_url,
      CASE WHEN owner.show_instagram = 1 THEN owner.instagram_url END AS owner_instagram_url,
      CASE WHEN owner.show_facebook = 1 THEN owner.facebook_url END AS owner_facebook_url,
      CASE WHEN owner.show_tiktok = 1 THEN owner.tiktok_url END AS owner_tiktok_url,
      CASE WHEN owner.show_telegram = 1 THEN owner.telegram_url END AS owner_telegram_url
    FROM product_items pi
    JOIN products p ON p.id = pi.product_id
    LEFT JOIN product_variants pv ON pv.id = pi.variant_id
    LEFT JOIN ownerships current_ownership
      ON current_ownership.product_item_id = pi.id
      AND current_ownership.is_current = 1
    LEFT JOIN users owner
      ON owner.id = current_ownership.user_id
      AND owner.show_profile_publicly = 1
      AND owner.show_wardrobe_publicly = 1
    WHERE pi.public_id = ${publicId}
    LIMIT 1
  `;
  if (!item) return null;

  const historyRows = await db`
    SELECT
      COALESCE(NULLIF(trim(u.name), ''), u.username) AS display_name,
      o.started_at,
      o.ended_at,
      o.acquisition_type
    FROM ownerships o
    JOIN users u ON u.id = o.user_id
    WHERE o.product_item_id = ${item.product_item_id}
      AND u.show_profile_publicly = 1
      AND u.show_wardrobe_publicly = 1
      AND (NULLIF(trim(u.name), '') IS NOT NULL OR u.username IS NOT NULL)
    ORDER BY o.started_at ASC
    LIMIT 100
  `;

  const productName = String(item.product_name);
  return {
    publicId: String(item.public_id),
    productName,
    model: productName,
    drop: null,
    size: item.size == null ? null : String(item.size),
    color: item.color_name == null ? null : String(item.color_name),
    serialNumber: String(item.serial_number),
    authenticity: "UNVERIFIED",
    currentOwner:
      item.owner_name == null && item.owner_username == null
        ? null
        : {
            displayName: item.owner_name == null ? null : String(item.owner_name),
            username:
              item.owner_username == null ? null : String(item.owner_username),
            avatarUrl:
              publicProfileUrl(item.owner_avatar_url),
            instagramUrl:
              publicProfileUrl(item.owner_instagram_url),
            facebookUrl:
              publicProfileUrl(item.owner_facebook_url),
            tiktokUrl:
              publicProfileUrl(item.owner_tiktok_url),
            telegramUrl:
              publicProfileUrl(item.owner_telegram_url),
          },
    ownershipHistory: historyRows.map((row) => ({
      displayName: String(row.display_name),
      startedAt: String(row.started_at),
      endedAt: row.ended_at == null ? null : String(row.ended_at),
      acquisitionType: String(row.acquisition_type),
    })),
  };
}

export async function getNfcClaimableItem(
  publicId: string,
): Promise<NfcClaimableItem | null> {
  const db = getDatabase();
  const [row] = await db`
    SELECT
      pi.public_id,
      pi.serial_number,
      p.name AS product_name,
      pv.size,
      pv.color_name,
      CASE WHEN
        pi.status != 'retired'
        AND nt.chip_uid IS NOT NULL
        AND nt.provisioning_status IN ('provisioned', 'qa_passed')
        AND EXISTS (
          SELECT 1
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN payments payment
            ON payment.order_id = o.id AND payment.status = 'approved'
          WHERE oi.product_item_id = pi.id
            AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
            AND o.payment_status = 'approved'
        )
        AND EXISTS (
          SELECT 1 FROM ownership_claim_codes claim
          WHERE claim.product_item_id = pi.id
            AND claim.status = 'active'
            AND datetime(claim.expires_at) > datetime('now')
        )
        AND NOT EXISTS (
          SELECT 1 FROM ownerships existing
          WHERE existing.product_item_id = pi.id
        )
      THEN 1 ELSE 0 END AS eligible
    FROM product_items pi
    JOIN products p ON p.id = pi.product_id
    LEFT JOIN product_variants pv ON pv.id = pi.variant_id
    LEFT JOIN nfc_tags nt ON nt.product_item_id = pi.id
    WHERE pi.public_id = ${publicId}
    LIMIT 1
  `;
  if (!row) return null;

  return {
    publicId: String(row.public_id),
    productName: String(row.product_name),
    serialNumber: String(row.serial_number),
    size: row.size == null ? null : String(row.size),
    color: row.color_name == null ? null : String(row.color_name),
    eligible: Number(row.eligible) === 1,
  };
}

export type NfcInventoryRow = {
  productItemId: string;
  publicId: string;
  productName: string;
  serialNumber: string;
  itemStatus: string;
  size: string | null;
  color: string | null;
  provisioningStatus: string;
  keyVersion: number | null;
  sdmEnabled: boolean;
};

export async function getNfcInventory(): Promise<NfcInventoryRow[]> {
  const db = getDatabase();
  const rows = await db`
    SELECT
      pi.id AS product_item_id,
      pi.public_id,
      pi.serial_number,
      pi.status AS item_status,
      p.name AS product_name,
      pv.size,
      pv.color_name,
      nt.provisioning_status,
      nt.key_version,
      nt.sdm_enabled
    FROM product_items pi
    JOIN products p ON p.id = pi.product_id
    LEFT JOIN product_variants pv ON pv.id = pi.variant_id
    LEFT JOIN nfc_tags nt ON nt.product_item_id = pi.id
    ORDER BY pi.serial_number ASC
    LIMIT 200
  `;
  return rows.map((row) => ({
    productItemId: String(row.product_item_id),
    publicId: String(row.public_id),
    productName: String(row.product_name),
    serialNumber: String(row.serial_number),
    itemStatus: String(row.item_status),
    size: row.size == null ? null : String(row.size),
    color: row.color_name == null ? null : String(row.color_name),
    provisioningStatus: String(row.provisioning_status ?? "unassigned"),
    keyVersion: row.key_version == null ? null : Number(row.key_version),
    sdmEnabled: Number(row.sdm_enabled) === 1,
  }));
}
