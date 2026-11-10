-- D1 Migration 0004 - Coupons system
-- Adds coupon codes for promotional discounts with validation rules
-- Run after: 0003_cart_items.sql

BEGIN TRANSACTION;

-- Coupons table - Discount code definitions
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed','shipping')),
  discount_value INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_purchase INTEGER,
  max_discount INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  expires_at TEXT,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_coupons_code_lower ON coupons(LOWER(code));
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = 1;
CREATE INDEX idx_coupons_expires ON coupons(expires_at) WHERE expires_at IS NOT NULL;

-- Insert some sample coupons (for testing/demo - should be removed in production)
INSERT INTO coupons (id, code, discount_type, discount_value, min_purchase, max_discount, is_active, created_at) VALUES
  ('CPN-20PERCENT', 'WELCOME20', 'percentage', 20, 100000, 50000, 1, datetime('now')),
  ('CPN-FIXED', 'SALE50K', 'fixed', 50000, 200000, NULL, 1, datetime('now')),
  ('CPN-SHIPFREE', 'FREESHIP', 'shipping', 0, 80000, NULL, 1, datetime('now'))
ON CONFLICT(id) DO NOTHING;

COMMIT;