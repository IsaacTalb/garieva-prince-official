import "server-only";
import { getDatabase } from "./d1/client";

type Order = {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  courier?: string | null;
  tracking_number?: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_item_id?: string | null;
  quantity: number;
  unit_price: number;
};

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM orders WHERE id = ${orderId}`;
  
  if (!rows[0]) return null;
  
  return parseOrder(rows[0]);
}

/**
 * Get an order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM orders WHERE order_number = ${orderNumber}`;
  
  if (!rows[0]) return null;
  
  return parseOrder(rows[0]);
}

/**
 * Get all orders for a user with pagination
 */
export async function getUserOrders(userId: string, options?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: Order[]; total: number }> {
  const db = getDatabase();
  
  let query = `
    SELECT id, order_number, customer_name, customer_email, customer_phone, 
           total_amount, status, payment_status, created_at, updated_at
    FROM orders
    WHERE user_id = ${userId} OR (user_id IS NULL AND customer_email LIKE ?)
  `;
  
  let limit: number | undefined;
  let offset: number | undefined;
  
  if (options?.limit) limit = options.limit;
  if (options?.offset) offset = options.offset;
  
  // Calculate total count
  const countQuery = query.replace("SELECT", "SELECT COUNT(*) as c FROM (", "") + 
    ` LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}) t`;
  
  const [countResult] = await db`${countQuery}`;
  const total = typeof countResult.c === "number" ? countResult.c : 0;
  
  // Get actual rows
  if (limit || offset) {
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    const rows = await db`${query}`;
    
    return {
      rows: rows.map(parseOrder),
      total,
    };
  } else {
    const rows = await db`${query} ORDER BY created_at DESC LIMIT 50`;
    return { rows: rows.map(parseOrder), total };
  }
}

/**
 * Create a new order with line items
 */
export async function createOrder({
  customerName,
  customerEmail,
  customerPhone,
  totalAmount,
  lineItems,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  lineItems?: OrderItem[];
}): Promise<{ id: string; order_number: string }> {
  const db = getDatabase();
  
  const orderId = `${customerEmail}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9]/g, '');
  
  // Create order
  const [orderResult] = await db`
    INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, total_amount, status, payment_status)
    VALUES (${orderId}, ${customerName}, ${customerEmail}, ${customerPhone}, ${totalAmount}, 'pending', 'pending')
    RETURNING id, order_number
  `;
  
  if (!orderResult) return { id: orderId, order_number: orderId };
  
  // Create order items if provided
  if (lineItems && lineItems.length > 0) {
    const itemsValues = lineItems.map(item => 
      `${item.product_id}, ${item.variant_id ?? "null"}, ${item.product_item_id ?? "null"}, ${item.quantity}, ${item.unit_price}`
    ).join(", ");
    
    await db`
      INSERT INTO order_items (order_id, product_id, variant_id, product_item_id, quantity, unit_price)
      VALUES (${orderId}, ${itemsValues})
    `;
  }
  
  return orderResult;
}

/**
 * Update an order (partial update)
 */
export async function updateOrder({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  totalAmount,
  status,
  paymentStatus,
  courier,
  trackingNumber,
}: {
  orderId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalAmount?: number | null;
  status?: string | null;
  paymentStatus?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    UPDATE orders
    SET customer_name = ${customerName ?? "null"}, 
        customer_email = ${customerEmail ?? "null"},
        customer_phone = ${customerPhone ?? "null"},
        total_amount = ${totalAmount ?? "null"},
        status = ${status ?? "null"},
        payment_status = ${paymentStatus ?? "null"},
        courier = ${courier ?? "null"},
        tracking_number = ${trackingNumber ?? "null"}
    WHERE id = ${orderId}
  `;
}

/**
 * Add line items to an order
 */
export async function addToOrder({
  orderId,
  lineItems,
}: {
  orderId: string;
  lineItems: OrderItem[];
}): Promise<void> {
  const db = getDatabase();
  
  if (lineItems.length === 0) return;
  
  const itemsValues = lineItems.map(item => 
    `${item.product_id}, ${item.variant_id ?? "null"}, ${item.product_item_id ?? "null"}, ${item.quantity}, ${item.unit_price}`
  ).join(", ");
  
  await db`
    INSERT INTO order_items (order_id, product_id, variant_id, product_item_id, quantity, unit_price)
    VALUES (${orderId}, ${itemsValues})
  `;
}

/**
 * Update order items (adjust quantities and prices)
 */
export async function updateOrderItems({
  orderId,
  lineItems,
}: {
  orderId: string;
  lineItems: OrderItem[];
}): Promise<void> {
  const db = getDatabase();
  
  for (const item of lineItems) {
    if (!item.id) continue;
    
    await db`
      UPDATE order_items
      SET quantity = ${item.quantity}, unit_price = ${item.unit_price}
      WHERE id = ${item.id} AND order_id = ${orderId}
    `;
  }
}

/**
 * Remove line items from an order
 */
export async function removeFromOrder(orderId: string, itemIds: string[]): Promise<void> {
  const db = getDatabase();
  
  if (itemIds.length === 0) return;
  
  await db`DELETE FROM order_items WHERE id IN ${db.joinValues(itemIds)}`;
}

/**
 * Soft delete an order
 */
export async function softDeleteOrder(orderId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE orders SET deleted_at = datetime('now') WHERE id = ${orderId}`;
}

/**
 * Check if an order exists
 */
export async function orderExists(orderId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM orders WHERE id = ${orderId} LIMIT 1`;
  return !!result;
}

/**
 * Delete an order (hard delete) - admin only
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM orders WHERE id = ${orderId}`;
}

function parseOrder(row: {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  payment_status: string;
  courier?: string | null;
  tracking_number?: string | null;
  created_at: string;
  updated_at: string;
}): Order {
  return {
    ...row,
    order_number: row.order_number.replace(/[^a-zA-Z0-9]/g, ''),
  };
}