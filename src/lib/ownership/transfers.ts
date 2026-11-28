import type { DatabaseBatchStatement } from "@/lib/db/d1/client";

type TransferDatabase = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>) & {
  batch(statements: DatabaseBatchStatement[]): Promise<number[]>;
};

export type OwnershipTransferStatus =
  | "initiated"
  | "recipient_pending"
  | "recipient_verified"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired";

export type OwnershipTransferRow = {
  id: string;
  publicId: string;
  serialNumber: string;
  productName: string;
  fromUserId: string;
  fromUserName: string | null;
  recipientUserId: string;
  recipientUserName: string | null;
  status: OwnershipTransferStatus;
  expiresAt: string;
  createdAt: string;
};

export async function createOwnershipTransfer(
  database: TransferDatabase,
  input: {
    publicId: string;
    fromUserId: string;
    recipientEmail: string;
    transferId: string;
    expiresAt: string;
  },
): Promise<boolean> {
  await expireTransfers(database);
  const changes = await database.batch([
    {
      query: `
        INSERT INTO ownership_transfers
          (id, product_item_id, from_user_id, recipient_user_id, status, expires_at)
        SELECT ?, pi.id, ?, recipient.id, 'initiated', ?
        FROM product_items pi
        JOIN ownerships current_owner
          ON current_owner.product_item_id = pi.id
          AND current_owner.user_id = ?
          AND current_owner.is_current = 1
        JOIN users recipient
          ON lower(recipient.email) = lower(?)
          AND recipient.id != ?
        WHERE pi.public_id = ?
          AND pi.status = 'owned'
          AND NOT EXISTS (
            SELECT 1 FROM ownership_transfers open_transfer
            WHERE open_transfer.product_item_id = pi.id
              AND open_transfer.status IN (
                'initiated',
                'recipient_pending',
                'recipient_verified',
                'confirmed'
              )
          )
        LIMIT 1
      `,
      params: [
        input.transferId,
        input.fromUserId,
        input.expiresAt,
        input.fromUserId,
        input.recipientEmail,
        input.fromUserId,
        input.publicId,
      ],
    },
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'recipient_pending', updated_at = datetime('now')
        WHERE id = ? AND status = 'initiated'
      `,
      params: [input.transferId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, from_user_id, 'ownership_transfer', id, 'transfer_initiated', ?
        FROM ownership_transfers
        WHERE id = ? AND status = 'recipient_pending'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE entity_type = 'ownership_transfer'
              AND entity_id = ownership_transfers.id
              AND action = 'transfer_initiated'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "recipient_pending" }),
        input.transferId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

async function expireTransfers(database: TransferDatabase): Promise<void> {
  await database.batch([
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'expired', updated_at = datetime('now')
        WHERE status IN (
          'initiated',
          'recipient_pending',
          'recipient_verified',
          'confirmed'
        )
          AND datetime(expires_at) <= datetime('now')
      `,
      params: [],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, entity_type, entity_id, action, after_json)
        SELECT lower(hex(randomblob(16))), 'ownership_transfer', transfer.id,
          'transfer_expired', ?
        FROM ownership_transfers transfer
        WHERE transfer.status = 'expired'
          AND datetime(transfer.expires_at) <= datetime('now')
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'ownership_transfer'
              AND audit.entity_id = transfer.id
              AND audit.action = 'transfer_expired'
          )
      `,
      params: [JSON.stringify({ status: "expired" })],
    },
  ]);
}

export async function getUserOwnershipTransfers(
  database: TransferDatabase,
  userId: string,
): Promise<OwnershipTransferRow[]> {
  await expireTransfers(database);
  const rows = await database`
    SELECT
      transfer.id,
      pi.public_id,
      pi.serial_number,
      product.name AS product_name,
      transfer.from_user_id,
      COALESCE(NULLIF(trim(sender.name), ''), sender.username) AS from_user_name,
      transfer.recipient_user_id,
      COALESCE(NULLIF(trim(recipient.name), ''), recipient.username) AS recipient_user_name,
      transfer.status,
      transfer.expires_at,
      transfer.created_at
    FROM ownership_transfers transfer
    JOIN product_items pi ON pi.id = transfer.product_item_id
    JOIN products product ON product.id = pi.product_id
    JOIN users sender ON sender.id = transfer.from_user_id
    JOIN users recipient ON recipient.id = transfer.recipient_user_id
    WHERE transfer.from_user_id = ${userId}
       OR transfer.recipient_user_id = ${userId}
    ORDER BY transfer.created_at DESC, transfer.id DESC
    LIMIT 100
  `;

  return rows.map((row) => ({
    id: String(row.id),
    publicId: String(row.public_id),
    serialNumber: String(row.serial_number),
    productName: String(row.product_name),
    fromUserId: String(row.from_user_id),
    fromUserName:
      row.from_user_name == null ? null : String(row.from_user_name),
    recipientUserId: String(row.recipient_user_id),
    recipientUserName:
      row.recipient_user_name == null
        ? null
        : String(row.recipient_user_name),
    status: String(row.status) as OwnershipTransferStatus,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  }));
}

export async function acceptOwnershipTransfer(
  database: TransferDatabase,
  input: { transferId: string; recipientUserId: string },
): Promise<boolean> {
  await expireTransfers(database);
  const changes = await database.batch([
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'recipient_verified',
            recipient_verified_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
          AND recipient_user_id = ?
          AND status = 'recipient_pending'
          AND datetime(expires_at) > datetime('now')
          AND EXISTS (
            SELECT 1
            FROM ownerships current_owner
            JOIN product_items pi
              ON pi.id = current_owner.product_item_id
            WHERE current_owner.product_item_id = ownership_transfers.product_item_id
              AND current_owner.user_id = ownership_transfers.from_user_id
              AND current_owner.is_current = 1
              AND pi.status = 'owned'
          )
      `,
      params: [input.transferId, input.recipientUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, recipient_user_id, 'ownership_transfer', id,
          'transfer_recipient_verified', ?
        FROM ownership_transfers
        WHERE id = ? AND status = 'recipient_verified'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE entity_type = 'ownership_transfer'
              AND entity_id = ownership_transfers.id
              AND action = 'transfer_recipient_verified'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "recipient_verified" }),
        input.transferId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function confirmOwnershipTransfer(
  database: TransferDatabase,
  input: { transferId: string; fromUserId: string },
): Promise<boolean> {
  await expireTransfers(database);
  const changes = await database.batch([
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'confirmed', confirmed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
          AND from_user_id = ?
          AND status = 'recipient_verified'
          AND datetime(expires_at) > datetime('now')
          AND EXISTS (
            SELECT 1
            FROM ownerships current_owner
            JOIN product_items pi
              ON pi.id = current_owner.product_item_id
            WHERE current_owner.product_item_id = ownership_transfers.product_item_id
              AND current_owner.user_id = ownership_transfers.from_user_id
              AND current_owner.is_current = 1
              AND pi.status = 'owned'
          )
      `,
      params: [input.transferId, input.fromUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, from_user_id, 'ownership_transfer', id,
          'transfer_confirmed', ?
        FROM ownership_transfers
        WHERE id = ? AND status = 'confirmed'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE entity_type = 'ownership_transfer'
              AND entity_id = ownership_transfers.id
              AND action = 'transfer_confirmed'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "confirmed" }),
        input.transferId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function completeOwnershipTransfer(
  database: TransferDatabase,
  input: {
    transferId: string;
    fromUserId: string;
    newOwnershipId: string;
  },
): Promise<boolean> {
  await expireTransfers(database);
  const completedAt = new Date().toISOString();
  const changes = await database.batch([
    {
      query: `
        UPDATE ownerships
        SET is_current = 0, ended_at = ?
        WHERE product_item_id = (
          SELECT transfer.product_item_id
          FROM ownership_transfers transfer
          JOIN product_items pi ON pi.id = transfer.product_item_id
          WHERE transfer.id = ?
            AND transfer.from_user_id = ?
            AND transfer.status = 'confirmed'
            AND datetime(transfer.expires_at) > datetime('now')
            AND pi.status = 'owned'
        )
          AND user_id = ?
          AND is_current = 1
      `,
      params: [
        completedAt,
        input.transferId,
        input.fromUserId,
        input.fromUserId,
      ],
    },
    {
      query: `
        INSERT INTO ownerships
          (id, product_item_id, user_id, started_at, acquisition_type, is_current)
        SELECT ?, transfer.product_item_id, transfer.recipient_user_id,
          ?, 'transfer', 1
        FROM ownership_transfers transfer
        JOIN product_items pi ON pi.id = transfer.product_item_id
        WHERE transfer.id = ?
          AND transfer.from_user_id = ?
          AND transfer.status = 'confirmed'
          AND datetime(transfer.expires_at) > datetime('now')
          AND pi.status = 'owned'
          AND EXISTS (
            SELECT 1 FROM ownerships previous
            WHERE previous.product_item_id = transfer.product_item_id
              AND previous.user_id = transfer.from_user_id
              AND previous.is_current = 0
              AND previous.ended_at = ?
          )
          AND NOT EXISTS (
            SELECT 1 FROM ownerships current_owner
            WHERE current_owner.product_item_id = transfer.product_item_id
              AND current_owner.is_current = 1
          )
      `,
      params: [
        input.newOwnershipId,
        completedAt,
        input.transferId,
        input.fromUserId,
        completedAt,
      ],
    },
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'completed', completed_at = ?, updated_at = datetime('now')
        WHERE id = ?
          AND from_user_id = ?
          AND status = 'confirmed'
          AND EXISTS (
            SELECT 1 FROM ownerships current_owner
            WHERE current_owner.id = ?
              AND current_owner.product_item_id = ownership_transfers.product_item_id
              AND current_owner.user_id = ownership_transfers.recipient_user_id
              AND current_owner.is_current = 1
          )
      `,
      params: [
        completedAt,
        input.transferId,
        input.fromUserId,
        input.newOwnershipId,
      ],
    },
    // The fallback row violates audit_logs.entity_id NOT NULL to roll back a partial D1 batch.
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, from_user_id, 'ownership_transfer', id, 'transfer_completed', ?
        FROM ownership_transfers
        WHERE id = ?
          AND status = 'completed'
          AND EXISTS (
            SELECT 1 FROM ownerships current_owner
            WHERE current_owner.product_item_id = ownership_transfers.product_item_id
              AND current_owner.user_id = ownership_transfers.recipient_user_id
              AND current_owner.is_current = 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE entity_type = 'ownership_transfer'
              AND entity_id = ownership_transfers.id
              AND action = 'transfer_completed'
          )
        UNION ALL
        SELECT ?, ?, 'ownership_transfer', NULL, 'transfer_completed', ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM ownership_transfers transfer
          JOIN ownerships current_owner
            ON current_owner.product_item_id = transfer.product_item_id
            AND current_owner.user_id = transfer.recipient_user_id
            AND current_owner.is_current = 1
          WHERE transfer.id = ? AND transfer.status = 'completed'
        )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "completed" }),
        input.transferId,
        crypto.randomUUID(),
        input.fromUserId,
        JSON.stringify({ status: "completion_failed" }),
        input.transferId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function cancelOwnershipTransfer(
  database: TransferDatabase,
  input: { transferId: string; actorUserId: string },
): Promise<boolean> {
  await expireTransfers(database);
  const changes = await database.batch([
    {
      query: `
        UPDATE ownership_transfers
        SET status = 'cancelled', cancelled_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
          AND status IN (
            'initiated',
            'recipient_pending',
            'recipient_verified',
            'confirmed'
          )
          AND datetime(expires_at) > datetime('now')
          AND (from_user_id = ? OR recipient_user_id = ?)
      `,
      params: [input.transferId, input.actorUserId, input.actorUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'ownership_transfer', id, 'transfer_cancelled', ?
        FROM ownership_transfers
        WHERE id = ? AND status = 'cancelled'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs
            WHERE entity_type = 'ownership_transfer'
              AND entity_id = ownership_transfers.id
              AND action = 'transfer_cancelled'
          )
      `,
      params: [
        crypto.randomUUID(),
        input.actorUserId,
        JSON.stringify({ status: "cancelled" }),
        input.transferId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}
