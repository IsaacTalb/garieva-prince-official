import "server-only";
import { getDatabase } from "./d1/client";
import { getUserById } from "./d1/users";

type Payment = {
  id: string;
  order_id: string;
  method: string;
  proof_object_key?: string | null;
  amount: number;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get a payment by ID
 */
export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM payments WHERE id = ${paymentId}`;
  
  if (!rows[0]) return null;
  
  return parsePayment(rows[0]);
}

/**
 * Get all payments for an order
 */
export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM payments WHERE order_id = ${orderId}`;
  
  return rows.map(parsePayment);
}

/**
 * Create a new payment record
 */
export async function createPayment({
  orderId,
  method,
  amount,
  proofObjectKey,
}: {
  orderId: string;
  method: string;
  amount: number;
  proofObjectKey?: string | null;
}): Promise<{ id: string }> {
  const db = getDatabase();
  
  const [result] = await db`
    INSERT INTO payments (order_id, method, proof_object_key, amount, status)
    VALUES (${orderId}, ${method}, ${proofObjectKey}, ${amount}, 'pending')
    RETURNING id
  `;
  
  return result;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus({
  paymentId,
  status,
}: {
  paymentId: string;
  status: "pending" | "approved" | "rejected" | "expired";
}): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE payments SET status = ${status} WHERE id = ${paymentId}`;
}

/**
 * Review a payment (admin)
 */
export async function reviewPayment({
  paymentId,
  reviewedByUserId,
  status,
  adminNotes,
}: {
  paymentId: string;
  reviewedByUserId: string;
  status: "approved" | "rejected" | "expired";
  adminNotes?: string | null;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    UPDATE payments
    SET status = ${status}, 
        reviewed_by = ${reviewedByUserId},
        reviewed_at = datetime('now'),
        admin_notes = ${adminNotes ?? "null"}
    WHERE id = ${paymentId}
  `;
}

/**
 * Reject a payment (admin)
 */
export async function rejectPayment({
  paymentId,
  reason,
}: {
  paymentId: string;
  reason: string;
}): Promise<void> {
  await reviewPayment({
    paymentId,
    reviewedByUserId: "system",
    status: "rejected",
    adminNotes: reason,
  });
}

/**
 * Soft delete a payment
 */
export async function softDeletePayment(paymentId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE payments SET deleted_at = datetime('now') WHERE id = ${paymentId}`;
}

/**
 * Check if a payment exists
 */
export async function paymentExists(paymentId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM payments WHERE id = ${paymentId} LIMIT 1`;
  return !!result;
}

/**
 * Get customer info from order associated with payment
 */
export async function getCustomerFromPayment(paymentId: string): Promise<{
  customer_email: string;
  customer_name: string;
  customer_phone: string;
} | null> {
  const db = getDatabase();
  
  const [payment] = await db`SELECT order_id FROM payments WHERE id = ${paymentId}`;
  
  if (!payment) return null;
  
  const [order] = await db`SELECT customer_email, customer_name, customer_phone FROM orders WHERE id = ${payment.order_id}`;
  
  return order ? { ...order } : null;
}

/**
 * Get user who reviewed this payment
 */
export async function getReviewerFromPayment(paymentId: string): Promise<{
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
} | null> {
  const db = getDatabase();
  
  const [payment] = await db`SELECT reviewed_by FROM payments WHERE id = ${paymentId}`;
  
  if (!payment?.reviewed_by) return null;
  
  try {
    return getUserById(payment.reviewed_by);
  } catch {
    // User may not exist or have invalid data
    return null;
  }
}

function parsePayment(row: {
  id: string;
  order_id: string;
  method: string;
  proof_object_key?: string | null;
  amount: number;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}): Payment {
  return { ...row };
}