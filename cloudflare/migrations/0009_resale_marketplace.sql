CREATE TABLE resale_listings (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  condition TEXT NOT NULL CHECK (
    condition IN ('new', 'like_new', 'good', 'fair')
  ),
  description TEXT NOT NULL,
  photos_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(photos_json)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'reserved', 'sold', 'withdrawn')
  ),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sold_at TEXT
);

CREATE UNIQUE INDEX idx_one_open_resale_listing_per_item
  ON resale_listings(product_item_id)
  WHERE status IN ('draft', 'active', 'reserved');

CREATE INDEX idx_resale_listings_status_created
  ON resale_listings(status, created_at DESC);

CREATE INDEX idx_resale_listings_seller
  ON resale_listings(seller_user_id, status, created_at DESC);

CREATE TABLE resale_listing_photos (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  status TEXT NOT NULL CHECK (status IN ('pending', 'uploaded', 'failed', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (listing_id, position)
);

CREATE INDEX idx_resale_listing_photos_quota
  ON resale_listing_photos(listing_id, status, position);

CREATE INDEX idx_resale_listing_photos_seller_day
  ON resale_listing_photos(created_at, listing_id, status);

CREATE TABLE resale_sales (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  seller_user_id TEXT NOT NULL,
  buyer_user_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0),
  seller_amount INTEGER NOT NULL CHECK (seller_amount >= 0),
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  payment_reference TEXT,
  payment_expires_at TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'approved', 'rejected', 'expired')
  ),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN (
      'pending_payment',
      'paid',
      'shipped',
      'completed',
      'payment_rejected',
      'cancelled',
      'expired'
    )
  ),
  tracking_number TEXT,
  paid_at TEXT,
  shipped_at TEXT,
  delivery_confirmed_at TEXT,
  ownership_transferred_at TEXT,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payout_status IN ('pending', 'ready', 'paid')
  ),
  payout_reference TEXT,
  payout_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (seller_user_id != buyer_user_id),
  CHECK (platform_fee + seller_amount = amount)
);

CREATE UNIQUE INDEX idx_one_open_sale_per_listing
  ON resale_sales(listing_id)
  WHERE status IN ('pending_payment', 'paid', 'shipped', 'completed');

CREATE INDEX idx_resale_sales_buyer
  ON resale_sales(buyer_user_id, created_at DESC);

CREATE INDEX idx_resale_sales_seller
  ON resale_sales(seller_user_id, created_at DESC);

CREATE INDEX idx_resale_sales_admin_queue
  ON resale_sales(status, payment_status, payout_status, created_at DESC);

CREATE INDEX idx_resale_sales_unpaid_expiry
  ON resale_sales(payment_expires_at, status, payment_reference);
