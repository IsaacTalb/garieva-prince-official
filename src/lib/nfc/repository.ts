import "server-only";
import { getDatabase } from "@/lib/db/d1/client";
import type {
  NfcPassport,
  NfcVerificationTarget,
} from "./types";

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
      COALESCE(NULLIF(trim(owner.name), ''), owner.username) AS current_owner
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
    currentOwner: item.current_owner == null ? null : String(item.current_owner),
    ownershipHistory: historyRows.map((row) => ({
      displayName: String(row.display_name),
      startedAt: String(row.started_at),
      endedAt: row.ended_at == null ? null : String(row.ended_at),
      acquisitionType: String(row.acquisition_type),
    })),
  };
}

export type NfcInventoryRow = {
  productItemId: string;
  publicId: string;
  productName: string;
  serialNumber: string;
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
    size: row.size == null ? null : String(row.size),
    color: row.color_name == null ? null : String(row.color_name),
    provisioningStatus: String(row.provisioning_status ?? "unassigned"),
    keyVersion: row.key_version == null ? null : Number(row.key_version),
    sdmEnabled: Number(row.sdm_enabled) === 1,
  }));
}
