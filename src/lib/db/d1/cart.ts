import "server-only";
import { getDatabase } from "./d1/client";
import { requireUser } from "@/lib/auth/session";

export type CartItem = {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
};

type CreateCartItemInput = {
  userId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
};

/**
 * Get current user's cart from session storage
 */
export async function getCart(userId: string): Promise<CartItem[] | []> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT product_id, variant_id, quantity 
    FROM cart_items 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  
  return rows.map(row => ({
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    quantity: row.quantity,
  }));
}

/**
 * Add item to cart or update quantity
 */
export async function addToCart({
  userId,
  productId,
  variantId,
  quantity,
}: CreateCartItemInput): Promise<CartItem> {
  const db = getDatabase();
  
  // Get existing cart items for this product/variant
  const [existing] = await db`
    SELECT product_id, variant_id, SUM(quantity) as total_quantity
    FROM cart_items
    WHERE user_id = ${userId} 
      AND (${variantId} IS NULL OR variant_id = ${variantId})
      AND product_id = ${productId}
    GROUP BY product_id, variant_id
  `;
  
  if (existing) {
    // Update existing item quantity
    const newQuantity = existing.total_quantity + quantity;
    
    await db`UPDATE cart_items SET quantity = ${newQuantity} WHERE id = ${existing.id}`;
    
    return {
      product_id: productId,
      variant_id: variantId ?? null,
      quantity: newQuantity,
    };
  }
  
  // Create new cart item
  const itemId = `CART-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  await db`
    INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity, created_at)
    VALUES (${itemId}, ${userId}, ${productId}, ${variantId}, ${quantity}, datetime('now'))
    RETURNING id, user_id, product_id, variant_id, quantity, created_at
  `;
  
  return {
    product_id: productId,
    variant_id: variantId ?? null,
    quantity,
  };
}

/**
 * Remove item from cart
 */
export async function removeFromCart(userId: string, productId: string, variantId?: string): Promise<void> {
  const db = getDatabase();
  
  await db`
    DELETE FROM cart_items 
    WHERE user_id = ${userId} 
      AND product_id = ${productId}
      AND (${variantId} IS NULL OR variant_id = ${variantId})
  `;
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM cart_items WHERE user_id = ${userId}`;
}

/**
 * Get cart item count (for badge)
 */
export async function getCartItemCount(userId: string): Promise<number> {
  const db = getDatabase();
  
  const [result] = await db`SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ${userId}`;
  return result?.total ?? 0;
}

/**
 * Get cart subtotal (sum of all item prices × quantities)
 */
export async function getCartSubtotal(userId: string): Promise<number> {
  const db = getDatabase();
  
  // Join with products to get price
  const rows = await db`
    SELECT 
      ci.quantity,
      p.price as unit_price
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id AND p.is_active = 1
    WHERE ci.user_id = ${userId}
  `;
  
  return rows.reduce((sum, row) => sum + (row.unit_price ?? 0) * row.quantity, 0);
}

/**
 * Delete a cart item by ID
 */
export async function deleteCartItem(itemId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM cart_items WHERE id = ${itemId}`;
}