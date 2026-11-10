import "server-only";
import { getDatabase } from "./d1/client";
import { requireAdminAccess } from "./d1/admin";

export type Coupon = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed" | "shipping";
  discount_value: number; // e.g., 20 for 20%, or 500 for $50 off
  min_purchase?: number | null; // Minimum cart value in MMK
  max_discount?: number | null; // Maximum discount amount in MMK
  is_active: boolean;
  expires_at?: string | null;
  usage_limit?: number | null; // Total times coupon can be used
  used_count: number;
  description?: string | null;
  created_at?: string;
};

type CreateCouponInput = {
  code: string;
  discountType: "percentage" | "fixed" | "shipping";
  discountValue: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  isActive?: boolean;
  expiresAt?: string | null;
  usageLimit?: number | null;
  description?: string | null;
};

/**
 * Get all active coupons (for admin)
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      c.id,
      c.code,
      c.discount_type,
      c.discount_value,
      c.min_purchase,
      c.max_discount,
      c.is_active,
      c.expires_at,
      c.usage_limit,
      c.used_count,
      c.description,
      c.created_at
    FROM coupons c
    WHERE c.is_active = 1
    ORDER BY c.created_at DESC
  `;
  
  return rows.map(row => ({
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: row.discount_value ?? 0,
    min_purchase: row.min_purchase ?? null,
    max_discount: row.max_discount ?? null,
    is_active: row.is_active === 1,
    expires_at: row.expires_at ?? null,
    usage_limit: row.usage_limit ?? null,
    used_count: row.used_count ?? 0,
    description: row.description ?? undefined,
    created_at: row.created_at,
  }));
}

/**
 * Get coupon by code (for validation)
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      c.id,
      c.code,
      c.discount_type,
      c.discount_value,
      c.min_purchase,
      c.max_discount,
      c.is_active,
      c.expires_at,
      c.usage_limit,
      c.used_count,
      c.description,
      c.created_at
    FROM coupons c
    WHERE LOWER(c.code) = LOWER(${code})
    LIMIT 1
  `;
  
  if (!rows[0]) return null;
  
  return {
    id: rows[0].id,
    code: rows[0].code,
    discount_type: rows[0].discount_type,
    discount_value: rows[0].discount_value ?? 0,
    min_purchase: rows[0].min_purchase ?? null,
    max_discount: rows[0].max_discount ?? null,
    is_active: rows[0].is_active === 1,
    expires_at: rows[0.expires_at ?? null,
    usage_limit: rows[0].usage_limit ?? null,
    used_count: rows[0].used_count ?? 0,
    description: rows[0].description ?? undefined,
    created_at: rows[0].created_at,
  };
}

/**
 * Create a new coupon (admin only)
 */
export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can create coupons");
  }
  
  // Generate unique ID
  const id = `CPN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  await db`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_purchase, max_discount, 
                        is_active, expires_at, usage_limit, used_count, description, created_at)
    VALUES (${id}, ${input.code}, ${input.discountType}, ${input.discountValue}, 
            ${input.minPurchase ?? null}, ${input.maxDiscount ?? null}, 
            COALESCE(${input.isActive ?? true}, 1), 
            ${input.expiresAt ?? null}, ${input.usageLimit ?? null}, 
            0, ${input.description ?? null}, datetime('now'))
    RETURNING id, code, discount_type, discount_value, min_purchase, max_discount, 
              is_active, expires_at, usage_limit, used_count, description, created_at
  `;
  
  const result = await db`SELECT * FROM coupons WHERE id = ${id}`;
  
  return {
    id: result.id,
    code: result.code,
    discount_type: result.discount_type,
    discount_value: result.discount_value ?? 0,
    min_purchase: result.min_purchase ?? null,
    max_discount: result.max_discount ?? null,
    is_active: result.is_active === 1,
    expires_at: result.expires_at ?? null,
    usage_limit: result.usage_limit ?? null,
    used_count: result.used_count ?? 0,
    description: result.description ?? undefined,
    created_at: result.created_at,
  };
}

/**
 * Update a coupon (admin only)
 */
export async function updateCoupon({
  couponId,
  code,
  discountType,
  discountValue,
  minPurchase,
  maxDiscount,
  isActive,
}: {
  couponId: string;
  code?: string;
  discountType?: "percentage" | "fixed" | "shipping";
  discountValue?: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  isActive?: boolean;
}): Promise<Coupon | null> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can update coupons");
  }
  
  const [updated] = await db`
    UPDATE coupons 
    SET 
      code = COALESCE(${code}, code),
      discount_type = ${discountType ?? discount_type},
      discount_value = COALESCE(${discountValue}, discount_value),
      min_purchase = ${minPurchase ?? min_purchase},
      max_discount = ${maxDiscount ?? max_discount},
      is_active = COALESCE(${isActive === undefined ? is_active : isActive}, is_active),
      updated_at = datetime('now')
    WHERE id = ${couponId}
    RETURNING id, code, discount_type, discount_value, min_purchase, max_discount, 
              is_active, expires_at, usage_limit, used_count, description, created_at
  `;
  
  if (!updated) return null;
  
  return {
    id: updated.id,
    code: updated.code,
    discount_type: updated.discount_type,
    discount_value: updated.discount_value ?? 0,
    min_purchase: updated.min_purchase ?? null,
    max_discount: updated.max_discount ?? null,
    is_active: updated.is_active === 1,
    expires_at: updated.expires_at ?? null,
    usage_limit: updated.usage_limit ?? null,
    used_count: updated.used_count ?? 0,
    description: updated.description ?? undefined,
    created_at: updated.created_at,
  };
}

/**
 * Delete a coupon (admin only)
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can delete coupons");
  }
  
  await db`DELETE FROM coupons WHERE id = ${couponId}`;
}

/**
 * Validate coupon code for checkout
 */
export async function validateCouponForCheckout({
  code,
  cartSubtotal,
}: {
  code: string;
  cartSubtotal: number;
}): Promise<{
  valid: boolean;
  error?: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed" | "shipping";
}> {
  const db = getDatabase();
  
  // Get coupon
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code." };
  }
  
  // Check if active
  if (!coupon.is_active) {
    return { valid: false, error: "This coupon is not active." };
  }
  
  // Check expiration
  if (coupon.expires_at) {
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);
    if (now > expiresAt) {
      return { valid: false, error: "This coupon has expired." };
    }
  }
  
  // Check minimum purchase
  if (coupon.min_purchase && cartSubtotal < coupon.min_purchase) {
    return { 
      valid: false, 
      error: `Minimum purchase of ${coupon.min_purchase.toLocaleString()} MMK required.` 
    };
  }
  
  // Calculate discount value
  let discountValue = 0;
  if (coupon.discount_type === "percentage") {
    discountValue = Math.floor(cartSubtotal * (coupon.discount_value / 100));
  } else if (coupon.discount_type === "fixed") {
    discountValue = coupon.discount_value ?? 0;
  } else if (coupon.discount_type === "shipping") {
    // Fixed amount for shipping discount
    discountValue = 15000; // Example: Free shipping over 50,000 MMK
  }
  
  // Check maximum discount
  if (coupon.max_discount && discountValue > coupon.max_discount) {
    discountValue = coupon.max_discount;
  }
  
  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, error: "This coupon has reached its usage limit." };
  }
  
  // Increment used count
  await db`UPDATE coupons SET used_count = used_count + 1 WHERE id = ${coupon.id}`;
  
  return {
    valid: true,
    discountValue,
    discountType: coupon.discount_type,
  };
}

/**
 * Get coupon usage statistics (for admin)
 */
export async function getCouponUsageStats(): Promise<{
  total_coupons: number;
  active_coupons: number;
  used_coupons: number;
}> {
  const db = getDatabase();
  
  const [stats] = await db`
    SELECT 
      COUNT(*) as total_coupons,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_coupons,
      SUM(used_count) as used_coupons
    FROM coupons
  `;
  
  return {
    total_coupons: stats.total_coupons ?? 0,
    active_coupons: stats.active_coupons ?? 0,
    used_coupons: stats.used_coupons ?? 0,
  };
}

/**
 * Reactivate a coupon (admin only)
 */
export async function reactivateCoupon(couponId: string): Promise<void> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can reactivate coupons");
  }
  
  await db`UPDATE coupons SET is_active = 1, updated_at = datetime('now') WHERE id = ${couponId}`;
}

/**
 * Deactivate a coupon (admin only)
 */
export async function deactivateCoupon(couponId: string): Promise<void> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can deactivate coupons");
  }
  
  await db`UPDATE coupons SET is_active = 0, updated_at = datetime('now') WHERE id = ${couponId}`;
}