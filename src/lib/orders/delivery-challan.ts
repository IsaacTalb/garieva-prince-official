import type { DatabaseBatchStatement } from "@/lib/db/d1/client";

type OrderDatabase = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>) & {
  batch(statements: DatabaseBatchStatement[]): Promise<number[]>;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  courier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  hasDeliveryChallan: boolean;
  deliveryChallan: {
    id: string;
    mimeType: string;
    uploadedAt: string;
  } | null;
};

export type DeliveryChallanRecord = {
  id: string;
  objectKey: string;
  mimeType: string;
  uploadedAt: string;
};

function parseOrder(row: Record<string, unknown>): OrderRecord {
  const challanId = row.delivery_challan_id;
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email),
    customerPhone: String(row.customer_phone),
    totalAmount: Number(row.total_amount),
    status: String(row.status),
    paymentStatus: String(row.payment_status),
    courier: row.courier == null ? null : String(row.courier),
    trackingNumber:
      row.tracking_number == null ? null : String(row.tracking_number),
    createdAt: String(row.created_at),
    hasDeliveryChallan: challanId != null,
    deliveryChallan:
      challanId == null
        ? null
        : {
            id: String(challanId),
            mimeType: String(row.delivery_challan_mime_type),
            uploadedAt: String(row.delivery_challan_uploaded_at),
          },
  };
}

export async function getAdminOrders(
  database: OrderDatabase,
): Promise<OrderRecord[]> {
  const rows = await database`
    SELECT order_row.id, order_row.order_number, order_row.customer_name,
           order_row.customer_email, order_row.customer_phone,
           order_row.total_amount, order_row.status, order_row.payment_status,
           order_row.courier, order_row.tracking_number, order_row.created_at,
           document.id AS delivery_challan_id,
           document.mime_type AS delivery_challan_mime_type,
           document.uploaded_at AS delivery_challan_uploaded_at
    FROM orders order_row
    LEFT JOIN order_delivery_documents document
      ON document.order_id = order_row.id AND document.status = 'active'
    ORDER BY order_row.created_at DESC, order_row.id DESC
    LIMIT 100
  `;
  return rows.map(parseOrder);
}

export async function getAdminOrder(
  database: OrderDatabase,
  orderId: string,
): Promise<OrderRecord | null> {
  const rows = await database`
    SELECT order_row.id, order_row.order_number, order_row.customer_name,
           order_row.customer_email, order_row.customer_phone,
           order_row.total_amount, order_row.status, order_row.payment_status,
           order_row.courier, order_row.tracking_number, order_row.created_at,
           document.id AS delivery_challan_id,
           document.mime_type AS delivery_challan_mime_type,
           document.uploaded_at AS delivery_challan_uploaded_at
    FROM orders order_row
    LEFT JOIN order_delivery_documents document
      ON document.order_id = order_row.id AND document.status = 'active'
    WHERE order_row.id = ${orderId}
    LIMIT 1
  `;
  return rows[0] ? parseOrder(rows[0]) : null;
}

export async function getCustomerOrder(
  database: OrderDatabase,
  orderId: string,
  userId: string,
): Promise<OrderRecord | null> {
  const rows = await database`
    SELECT order_row.id, order_row.order_number, order_row.customer_name,
           order_row.customer_email, order_row.customer_phone,
           order_row.total_amount, order_row.status, order_row.payment_status,
           order_row.courier, order_row.tracking_number, order_row.created_at,
           document.id AS delivery_challan_id,
           document.mime_type AS delivery_challan_mime_type,
           document.uploaded_at AS delivery_challan_uploaded_at
    FROM orders order_row
    LEFT JOIN order_delivery_documents document
      ON document.order_id = order_row.id AND document.status = 'active'
    WHERE order_row.id = ${orderId}
      AND order_row.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? parseOrder(rows[0]) : null;
}

export async function getCurrentDeliveryChallan(
  database: OrderDatabase,
  orderId: string,
): Promise<DeliveryChallanRecord | null> {
  const [row] = await database`
    SELECT id, object_key, mime_type, uploaded_at
    FROM order_delivery_documents
    WHERE order_id = ${orderId} AND status = 'active'
    LIMIT 1
  `;
  return row
    ? {
        id: String(row.id),
        objectKey: String(row.object_key),
        mimeType: String(row.mime_type),
        uploadedAt: String(row.uploaded_at),
      }
    : null;
}

export async function getReplacedDeliveryChallanKeys(
  database: OrderDatabase,
  replacementId: string,
): Promise<string[]> {
  const rows = await database`
    SELECT object_key
    FROM order_delivery_documents
    WHERE replaced_by = ${replacementId}
  `;
  return rows.map((row) => String(row.object_key));
}

export async function replaceDeliveryChallan(
  database: OrderDatabase,
  input: {
    documentId: string;
    orderId: string;
    adminUserId: string;
    objectKey: string;
    mimeType: string;
    courier: string;
    trackingNumber: string;
  },
): Promise<boolean> {
  const after = JSON.stringify({
    status: "shipped",
    mimeType: input.mimeType,
    courier: input.courier,
    trackingNumber: input.trackingNumber,
  });
  const auditIsValid = `
    EXISTS (
      SELECT 1
      FROM order_delivery_documents document
      JOIN orders order_row ON order_row.id = document.order_id
      WHERE document.id = ?
        AND document.order_id = ?
        AND document.status = 'active'
        AND order_row.status = 'shipped'
        AND order_row.courier = ?
        AND order_row.tracking_number = ?
    )
  `;
  const changes = await database.batch([
    {
      query: `
        UPDATE order_delivery_documents
        SET status = 'replaced', replaced_by = ?
        WHERE order_id = ? AND status = 'active'
      `,
      params: [input.documentId, input.orderId],
    },
    {
      query: `
        INSERT INTO order_delivery_documents
          (id, order_id, object_key, mime_type, uploaded_by, status)
        SELECT ?, order_row.id, ?, ?, ?, 'active'
        FROM orders order_row
        WHERE order_row.id = ?
          AND order_row.payment_status = 'approved'
          AND order_row.status IN ('paid', 'processing', 'shipped')
      `,
      params: [
        input.documentId,
        input.objectKey,
        input.mimeType,
        input.adminUserId,
        input.orderId,
      ],
    },
    {
      query: `
        UPDATE orders
        SET status = 'shipped', courier = ?, tracking_number = ?,
            updated_at = datetime('now')
        WHERE id = ?
          AND payment_status = 'approved'
          AND status IN ('paid', 'processing', 'shipped')
          AND EXISTS (
            SELECT 1 FROM order_delivery_documents document
            WHERE document.id = ? AND document.status = 'active'
          )
      `,
      params: [
        input.courier,
        input.trackingNumber,
        input.orderId,
        input.documentId,
      ],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'order_delivery_document', ?,
          CASE WHEN EXISTS (
            SELECT 1 FROM order_delivery_documents prior
            WHERE prior.replaced_by = ?
          ) THEN 'delivery_challan_replaced'
            ELSE 'delivery_challan_uploaded'
          END,
          ?
        WHERE ${auditIsValid}
        UNION ALL
        SELECT ?, ?, 'order_delivery_document', NULL,
          'delivery_challan_upload_failed', ?
        WHERE NOT ${auditIsValid}
      `,
      params: [
        crypto.randomUUID(),
        input.adminUserId,
        input.documentId,
        input.documentId,
        after,
        input.documentId,
        input.orderId,
        input.courier,
        input.trackingNumber,
        crypto.randomUUID(),
        input.adminUserId,
        after,
        input.documentId,
        input.orderId,
        input.courier,
        input.trackingNumber,
      ],
    },
  ]);
  return changes[1] === 1 && changes[2] === 1 && changes[3] === 1;
}

export async function removeDeliveryChallan(
  database: OrderDatabase,
  input: { documentId: string; orderId: string; adminUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE order_delivery_documents
        SET status = 'removed'
        WHERE id = ? AND order_id = ? AND status = 'active'
      `,
      params: [input.documentId, input.orderId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'order_delivery_document', id,
          'delivery_challan_removed', ?
        FROM order_delivery_documents
        WHERE id = ? AND order_id = ? AND status = 'removed'
        UNION ALL
        SELECT ?, ?, 'order_delivery_document', NULL,
          'delivery_challan_remove_failed', ?
        WHERE NOT EXISTS (
          SELECT 1 FROM order_delivery_documents
          WHERE id = ? AND order_id = ? AND status = 'removed'
        )
      `,
      params: [
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ status: "removed" }),
        input.documentId,
        input.orderId,
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ status: "remove_failed" }),
        input.documentId,
        input.orderId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}
