-- D1 Migration 0003 - Cart items session storage
-- Stores cart items per user session with quantity tracking
-- Run after: 0002_categories.sql

BEGIN TRANSACTION;

-- Cart items table - Session-based cart storage
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- Create unique constraint to prevent duplicate items for same product+variant
CREATE UNIQUE INDEX idx_cart_item_unique ON cart_items(user_id, product_id, variant_id) 
  WHERE variant_id IS NOT NULL;

COMMIT;