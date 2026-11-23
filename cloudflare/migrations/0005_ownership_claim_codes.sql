-- Migration: 0005_ownership_claim_codes.sql
-- Purpose: Add claim codes table for ownership creation flow
-- Phase: 7 - Manual Payment + Email Claim Code

-- Create claim codes table
CREATE TABLE IF NOT EXISTS ownership_claim_codes (
  id TEXT PRIMARY KEY,
  product_item_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'redeemed', 'expired', 'invalidated')),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_claim_codes_product_item 
  ON ownership_claim_codes(product_item_id);

CREATE INDEX IF NOT EXISTS idx_claim_codes_status 
  ON ownership_claim_codes(status);

CREATE INDEX IF NOT EXISTS idx_claim_codes_expires 
  ON ownership_claim_codes(expires_at);

-- Create audit trigger for claim code status changes (optional enhancement)
-- CREATE TRIGGER IF NOT EXISTS audit_claim_code_status
-- AFTER UPDATE OF status ON ownership_claim_codes
-- BEGIN
--   INSERT INTO audit_logs (event_type, entity_type, entity_id, created_at)
--   VALUES ('claim_code_status_changed', 'ownership_claim_code', NEW.id, datetime('now'));
-- END;

SELECT 'Migration 0005_ownership_claim_codes completed successfully';