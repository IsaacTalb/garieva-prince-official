CREATE TABLE ownership_transfers (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'initiated',
      'recipient_pending',
      'recipient_verified',
      'confirmed',
      'completed',
      'cancelled',
      'expired'
    )
  ),
  expires_at TEXT NOT NULL,
  recipient_verified_at TEXT,
  confirmed_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_user_id != recipient_user_id)
);

CREATE UNIQUE INDEX idx_one_open_transfer_per_item
  ON ownership_transfers(product_item_id)
  WHERE status IN (
    'initiated',
    'recipient_pending',
    'recipient_verified',
    'confirmed'
  );

CREATE INDEX idx_transfers_from_user
  ON ownership_transfers(from_user_id, status, created_at DESC);

CREATE INDEX idx_transfers_recipient_user
  ON ownership_transfers(recipient_user_id, status, created_at DESC);
