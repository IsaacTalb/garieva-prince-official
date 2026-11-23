-- Phase 9 - explicit opt-in for public wardrobe and NFC replay-counter storage.
ALTER TABLE users
  ADD COLUMN show_wardrobe_publicly INTEGER NOT NULL DEFAULT 0
  CHECK (show_wardrobe_publicly IN (0, 1));

CREATE TABLE nfc_verification_events (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL,
  key_version INTEGER NOT NULL CHECK (key_version > 0),
  tap_counter INTEGER NOT NULL CHECK (tap_counter >= 0),
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_item_id, key_version, tap_counter)
);

CREATE INDEX idx_nfc_verifications_item
  ON nfc_verification_events(product_item_id, verified_at DESC);
