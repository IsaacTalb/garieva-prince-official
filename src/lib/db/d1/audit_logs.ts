import "server-only";
import { getDatabase } from "./d1/client";

type AuditLog = {
  id: string;
  actor_user_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: string | null;
  after_json?: string | null;
  created_at: string;
};

/**
 * Get recent audit logs for an entity
 */
export async function getEntityAuditLogs({
  entityType,
  entityId,
  limit = 50,
}: {
  entityType: string;
  entityId: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT * FROM audit_logs
    WHERE entity_type = ${entityType} AND entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return rows.map(row => ({ ...row }));
}

/**
 * Get all recent audit logs (admin)
 */
export async function getAllAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const db = getDatabase();
  
  const rows = await db`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`;
  
  return rows.map(row => ({ ...row }));
}

/**
 * Create an audit log entry
 */
export async function createAuditLog({
  actorUserId,
  entityType,
  entityId,
  action,
  beforeJson,
  afterJson,
}: {
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: string | null;
  afterJson?: string | null;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  const [result] = await db`
    INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, before_json, after_json)
    VALUES (${actorUserId}, ${entityType}, ${entityId}, ${action}, ${beforeJson ?? "null"}, ${afterJson ?? "null"})
    RETURNING id
  `;
  
  return result;
}

/**
 * Log a user creation
 */
export async function logUserCreated({
  email,
  userId,
}: {
  email: string;
  userId: string;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "users",
    entityId: userId,
    action: "user_created",
    afterJson: JSON.stringify({ email }),
  });
}

/**
 * Log a user update
 */
export async function logUserUpdated({
  userId,
  changes,
}: {
  userId: string;
  changes: Record<string, any>;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "users",
    entityId: userId,
    action: "user_updated",
    afterJson: JSON.stringify(changes),
  });
}

/**
 * Log a user deletion
 */
export async function logUserDeleted(userId: string): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "users",
    entityId: userId,
    action: "user_deleted",
  });
}

/**
 * Log a product creation
 */
export async function logProductCreated({
  productId,
  name,
}: {
  productId: string;
  name: string;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "products",
    entityId: productId,
    action: "product_created",
    afterJson: JSON.stringify({ name }),
  });
}

/**
 * Log a product update
 */
export async function logProductUpdated({
  productId,
  changes,
}: {
  productId: string;
  changes: Record<string, any>;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "products",
    entityId: productId,
    action: "product_updated",
    afterJson: JSON.stringify(changes),
  });
}

/**
 * Log a product deletion
 */
export async function logProductDeleted(productId: string): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "products",
    entityId: productId,
    action: "product_deleted",
  });
}

/**
 * Log an order creation
 */
export async function logOrderCreated({
  orderId,
  customerName,
  totalAmount,
}: {
  orderId: string;
  customerName: string;
  totalAmount: number;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "orders",
    entityId: orderId,
    action: "order_created",
    afterJson: JSON.stringify({ customer_name: customerName, total_amount: totalAmount }),
  });
}

/**
 * Log an order status update
 */
export async function logOrderStatusChanged({
  orderId,
  previousStatus,
  newStatus,
}: {
  orderId: string;
  previousStatus: string;
  newStatus: string;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "orders",
    entityId: orderId,
    action: `order_status_changed_from_${previousStatus}_to_${newStatus}`,
    beforeJson: JSON.stringify({ status: previousStatus }),
    afterJson: JSON.stringify({ status: newStatus }),
  });
}

/**
 * Log an ownership transfer
 */
export async function logOwnershipTransferred({
  productId,
  serialNumber,
  previousOwnerId,
  newOwnerId,
}: {
  productId: string;
  serialNumber: string;
  previousOwnerId?: string | null;
  newOwnerId: string;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "product_items",
    entityId: `${productId}_${serialNumber}`,
    action: "ownership_transferred",
    beforeJson: previousOwnerId ? JSON.stringify({ previous_owner_id: previousOwnerId }) : null,
    afterJson: JSON.stringify({ new_owner_id: newOwnerId }),
  });
}

/**
 * Log an NFC tag verification
 */
export async function logNfcVerification({
  productId,
  serialNumber,
}: {
  productId: string;
  serialNumber: string;
}): Promise<void> {
  await createAuditLog({
    actorUserId: "system",
    entityType: "nfc_tags",
    entityId: `${productId}_${serialNumber}`,
    action: "nfc_verified",
  });
}

/**
 * Log an admin action
 */
export async function logAdminAction({
  userId,
  entityType,
  entityId,
  action,
  notes,
}: {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  notes?: string | null;
}): Promise<void> {
  await createAuditLog({
    actorUserId: userId,
    entityType,
    entityId,
    action,
    afterJson: notes ? JSON.stringify({ notes }) : null,
  });
}