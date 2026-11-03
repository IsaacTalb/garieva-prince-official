PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  name TEXT,
  username TEXT UNIQUE COLLATE NOCASE,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('sign_in','sign_up','change_email')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_codes_email_created ON email_verification_codes(email, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','manager')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  color_name TEXT,
  color_hex TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price INTEGER CHECK (price IS NULL OR price >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  public_id TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'manufacturing' CHECK (
    status IN ('manufacturing','provisioned','available','reserved','sold','owned','listed_for_resale','transfer_pending','retired')
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_product_items_product ON product_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_items_status ON product_items(status);

CREATE TABLE IF NOT EXISTS nfc_tags (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL UNIQUE REFERENCES product_items(id) ON DELETE CASCADE,
  chip_uid TEXT UNIQUE,
  tag_type TEXT NOT NULL DEFAULT 'NTAG424DNA',
  key_version INTEGER NOT NULL DEFAULT 1,
  provisioning_status TEXT NOT NULL DEFAULT 'unassigned' CHECK (
    provisioning_status IN ('unassigned','testing','provisioned','qa_passed','retired')
  ),
  sdm_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sdm_enabled IN (0,1)),
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ownership_claim_codes (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL UNIQUE REFERENCES product_items(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','active','used','revoked')),
  activated_at TEXT,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ownerships (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL REFERENCES product_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  acquisition_type TEXT NOT NULL CHECK (
    acquisition_type IN ('original_purchase','resale','transfer','gift','admin_assignment')
  ),
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0,1))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_owner
  ON ownerships(product_item_id)
  WHERE is_current = 1;
CREATE INDEX IF NOT EXISTS idx_ownership_user ON ownerships(user_id, is_current);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','approved','rejected','expired')),
  courier TEXT,
  tracking_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  product_item_id TEXT REFERENCES product_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  proof_object_key TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_delivery_documents (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restock_subscriptions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','notified','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_restock_unique
  ON restock_subscriptions(product_id, IFNULL(variant_id, ''), email)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
