-- D1 Migration 0001 - Core application schema for Garieva Prince
-- D1 uses SQLite. Foreign keys, COLLATE, and CURRENT_TIMESTAMP are supported.
-- Run once to create all tables and indexes.

BEGIN TRANSACTION;

-- Users table - Customer accounts with optional profile visibility controls
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  name TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  telegram_url TEXT,
  show_profile_publicly INTEGER NOT NULL DEFAULT 1 CHECK (show_profile_publicly IN (0,1)),
  show_avatar_publicly INTEGER NOT NULL DEFAULT 1 CHECK (show_avatar_publicly IN (0,1)),
  show_instagram INTEGER NOT NULL DEFAULT 1 CHECK (show_instagram IN (0,1)),
  show_facebook INTEGER NOT NULL DEFAULT 1 CHECK (show_facebook IN (0,1)),
  show_tiktok INTEGER NOT NULL DEFAULT 1 CHECK (show_tiktok IN (0,1)),
  show_telegram INTEGER NOT NULL DEFAULT 1 CHECK (show_telegram IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Email verification codes - OTP for passwordless authentication
CREATE TABLE email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('sign_in','sign_up','change_email')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_email_codes_email ON email_verification_codes(email);

-- Sessions - Secure opaque session tokens (hashes only)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at);

-- Admins table - Role-based admin authorization
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','manager')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_admins_user ON admins(user_id);

-- Products - Catalog items with pricing and stock tracking
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_created ON products(created_at DESC, id DESC);

-- Product variants - Size/color options per product
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  size TEXT,
  color_name TEXT,
  color_hex TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Product items - Physical garment instances with lifecycle tracking
CREATE TABLE product_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  public_id TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'manufacturing' CHECK (
    status IN ('manufacturing','provisioned','available','reserved','sold','owned','listed_for_resale','transfer_pending','retired')
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_product_items_product ON product_items(product_id);
CREATE INDEX idx_product_items_status ON product_items(status);

-- NFC tags - NTAG424DNA authentication for each item
CREATE TABLE nfc_tags (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL UNIQUE,
  chip_uid TEXT UNIQUE,
  tag_type TEXT NOT NULL DEFAULT 'NTAG424DNA',
  key_version INTEGER NOT NULL DEFAULT 1,
  provisioning_status TEXT NOT NULL DEFAULT 'unassigned' CHECK (
    provisioning_status IN ('unassigned','testing','provisioned','qa_passed','retired')
  ),
  sdm_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sdm_enabled IN (0,1)),
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ownership claim codes - One-time codes for item claims via Brevo
CREATE TABLE ownership_claim_codes (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','active','used','revoked')),
  activated_at TEXT,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ownerships - Current and historical ownership records
CREATE TABLE ownerships (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  acquisition_type TEXT NOT NULL CHECK (
    acquisition_type IN ('original_purchase','resale','transfer','gift','admin_assignment')
  ),
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0,1))
);
CREATE UNIQUE INDEX idx_one_current_owner ON ownerships(product_item_id) WHERE is_current = 1;
CREATE INDEX idx_ownership_user ON ownerships(user_id, is_current);

-- Orders - Customer orders with status and payment tracking
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','approved','rejected','expired')),
  courier TEXT,
  tracking_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Order items - Line items in each order
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  product_item_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Payments - Payment records with admin review workflow
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL,
  proof_object_key TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_payments_order ON payments(order_id);

-- Order delivery documents - Digital challan/proof uploads
CREATE TABLE order_delivery_documents (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_docs_order ON order_delivery_documents(order_id);

-- Restock subscriptions - Back-in-stock notifications
CREATE TABLE restock_subscriptions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  user_id TEXT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','notified','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notified_at TEXT
);
CREATE INDEX idx_subscriptions_product ON restock_subscriptions(product_id, variant_id, email);

-- Audit logs - Activity tracking for admin tools
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);

COMMIT;