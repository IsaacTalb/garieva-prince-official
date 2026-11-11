-- Migration: 0006_payment_approvals.sql
-- Purpose: Add payment approval tracking table
-- Phase: 7 - Manual Payment + Email Claim Code

PRAGMA foreign_keys = ON;

-- Create payment approvals table for tracking admin actions
CREATE TABLE IF NOT EXISTS payment_approvals (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  approved_by TEXT NOT NULL, -- Admin user ID or system
  approved_at TEXT NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_approvals_order_id 
  ON payment_approvals(order_id);

CREATE INDEX IF NOT EXISTS idx_approvals_approved_by 
  ON payment_approvals(approved_by);

-- Insert sample approval for testing
INSERT OR IGNORE INTO payment_approvals VALUES
  ('approval_test_001', 'order_test_payment_001', 
   'admin_super_admin_id',
   datetime('now'), NULL, datetime('now'));

-- Create view for admin dashboard (optional)
CREATE VIEW IF NOT EXISTS v_order_payment_status AS
SELECT 
  o.id as order_id,
  o.product_name,
  o.status as order_status,
  o.total_amount,
  CASE 
    WHEN o.status = 'pending_payment' THEN 'Awaiting Payment'
    WHEN o.status = 'payment_proof_uploaded' THEN 'Payment Proof Uploaded'
    WHEN o.status = 'paid' THEN 'Paid - Processing'
    WHEN o.status = 'processing' THEN 'Processing'
    WHEN o.status = 'shipped' THEN 'Shipped'
    ELSE 'Unknown'
  END as payment_status,
  pa.approved_at,
  pa.notes
FROM orders o
LEFT JOIN payment_approvals pa ON o.id = pa.order_id;

SELECT 'Migration 0006_payment_approvals completed successfully';