-- Migration: 0005_ownership_claim_codes.sql
-- Purpose: Add claim codes table for ownership creation flow
-- Phase: 7 - Manual Payment + Email Claim Code

PRAGMA foreign_keys = ON;

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

-- Insert sample claim codes for testing (SHA-256 hashes)
-- Note: These are example hashes, replace with actual generated values in production
INSERT OR IGNORE INTO ownership_claim_codes VALUES
  ('claim_GP001_test', 'gp001', 
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- SHA-256 of empty string (example)
   'active', datetime('now', '+24 hours')),
  
  ('claim_GP002_test', 'gp002', 
   'd8e8fca2dc0f896fd7cb4cb0031ba249', -- Another example hash
   'active', datetime('now', '+24 hours')),
  
  ('claim_GP003_test', 'gp003', 
   '9b5111de4efa9b5e67b9c7d9f8e3e7e7e3f7e7e7e7e7e7e7e7e7e7e7e7',
   'active', datetime('now', '+24 hours'));

-- Create audit trigger for claim code status changes (optional enhancement)
-- CREATE TRIGGER IF NOT EXISTS audit_claim_code_status
-- AFTER UPDATE OF status ON ownership_claim_codes
-- BEGIN
--   INSERT INTO audit_logs (event_type, entity_type, entity_id, created_at)
--   VALUES ('claim_code_status_changed', 'ownership_claim_code', NEW.id, datetime('now'));
-- END;

SELECT 'Migration 0005_ownership_claim_codes completed successfully';