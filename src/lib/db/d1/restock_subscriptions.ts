import "server-only";
import { getDatabase } from "./d1/client";

type RestockSubscription = {
  id: string;
  product_id: string;
  variant_id?: string | null;
  user_id?: string | null;
  email: string;
  status: string;
  created_at: string;
  notified_at?: string | null;
};

/**
 * Get active subscriptions for a specific product/variant
 */
export async function getProductSubscriptions({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string | null;
}): Promise<RestockSubscription[]> {
  const db = getDatabase();
  
  let query = `
    SELECT * FROM restock_subscriptions
    WHERE product_id = ${productId}
    ${variantId ? `AND variant_id IS NULL OR variant_id = ${variantId}` : ''}
  `;
  
  if (variantId) {
    query += ` AND (user_id IS NOT NULL OR email NOT LIKE '%garieva-prince%')`;
  } else {
    // If no variant specified, only show subscribed emails, not bulk notification
    query += `AND (user_id IS NOT NULL OR (email NOT LIKE 'garieva-prince%' AND status = 'active'))`;
  }
  
  const rows = await db`${query}`;
  
  return rows.map(row => ({ ...row, user_id: row.user_id ? "subscribed" : null }));
}

/**
 * Get all active subscriptions (admin)
 */
export async function getAllActiveSubscriptions(): Promise<RestockSubscription[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT * FROM restock_subscriptions
    WHERE status = 'active'
    ORDER BY created_at ASC
  `;
  
  return rows.map(row => ({ ...row }));
}

/**
 * Create a new back-in-stock subscription
 */
export async function createSubscription({
  email,
  productId,
  variantId,
}: {
  email: string;
  productId: string;
  variantId?: string | null;
}): Promise<RestockSubscription | null> {
  const db = getDatabase();
  
  try {
    const [result] = await db`
      INSERT INTO restock_subscriptions (product_id, variant_id, email, status)
      VALUES (${productId}, ${variantId}, lower(${email}), 'active')
      ON CONFLICT(product_id, IFNULL(variant_id, ''), email) DO UPDATE SET 
        status = 'active', notified_at = NULL
      RETURNING id, product_id, user_id, email, status, created_at, notified_at
    `;
    
    if (!result) return null;
    
    try {
      return { ...result, user_id: "subscribed" };
    } catch {
      // Parse error in result - return as is
      return { ...result, user_id: "subscribed" };
    }
  } catch (error) {
    // Handle duplicate constraint gracefully
    const [existing] = await db`SELECT * FROM restock_subscriptions WHERE product_id = ${productId} AND email = lower(${email}) LIMIT 1`;
    return existing ? { ...existing, user_id: "subscribed" } : null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription({
  productId,
  variantId,
  email,
}: {
  productId: string;
  variantId?: string | null;
  email: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`
      UPDATE restock_subscriptions
      SET status = 'cancelled'
      WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = ${variantId})
        AND lower(email) = lower(${email})
    `;
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a subscription entirely
 */
export async function removeSubscription({
  productId,
  variantId,
  email,
}: {
  productId: string;
  variantId?: string | null;
  email: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`
      DELETE FROM restock_subscriptions
      WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = ${variantId})
        AND lower(email) = lower(${email})
    `;
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a subscription as notified after sending email
 */
export async function markAsNotified({
  productId,
  variantId,
  email,
}: {
  productId: string;
  variantId?: string | null;
  email: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`
      UPDATE restock_subscriptions
      SET status = 'notified', notified_at = datetime('now')
      WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = ${variantId})
        AND lower(email) = lower(${email})
    `;
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an email is subscribed to a product's back-in-stock notifications
 */
export async function isSubscribed({
  productId,
  variantId,
  email,
}: {
  productId: string;
  variantId?: string | null;
  email: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  const [result] = await db`
    SELECT 1 FROM restock_subscriptions
    WHERE product_id = ${productId}
      AND (variant_id IS NULL OR variant_id = ${variantId})
      AND lower(email) = lower(${email})
      AND status = 'active'
    LIMIT 1
  `;
  
  return !!result;
}

/**
 * Get subscription details for a specific email
 */
export async function getSubscription({
  productId,
  variantId,
  email,
}: {
  productId: string;
  variantId?: string | null;
  email: string;
}): Promise<RestockSubscription | null> {
  const db = getDatabase();
  
  const [result] = await db`
    SELECT * FROM restock_subscriptions
    WHERE product_id = ${productId}
      AND (variant_id IS NULL OR variant_id = ${variantId})
      AND lower(email) = lower(${email})
    LIMIT 1
  `;
  
  return result ? { ...result, user_id: "subscribed" } : null;
}

/**
 * Bulk unsubscribe for a product/variant
 */
export async function bulkUnsubscribe({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string | null;
}): Promise<void> {
  const db = getDatabase();
  
  try {
    await db`
      UPDATE restock_subscriptions
      SET status = 'cancelled'
      WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = ${variantId})
    `;
  } catch {
    // Ignore if no matches
  }
}

/**
 * Delete all subscriptions for a product/variant (admin)
 */
export async function deleteProductSubscriptions({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string | null;
}): Promise<void> {
  const db = getDatabase();
  
  try {
    await db`
      DELETE FROM restock_subscriptions
      WHERE product_id = ${productId}
        AND (variant_id IS NULL OR variant_id = ${variantId})
    `;
  } catch {
    // Ignore if no matches
  }
}