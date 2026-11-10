-- D1 Migration 0002 - Categories hierarchy
-- Adds hierarchical product categories with parent-child relationships
-- Run after: 0001_core.sql

BEGIN TRANSACTION;

-- Categories table - Hierarchical product categorization
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = 1;

-- Insert root-level default categories
INSERT INTO categories (id, name, slug, sort_order, created_at) VALUES
  ('CAT-ROOT-FASHION', 'Fashion', 'fashion', 1, datetime('now')),
  ('CAT-ROOT-FOOTWEAR', 'Footwear', 'footwear', 2, datetime('now')),
  ('CAT-ROOT-ACCESORIES', 'Accessories', 'accessories', 3, datetime('now'))
ON CONFLICT(id) DO NOTHING;

COMMIT;