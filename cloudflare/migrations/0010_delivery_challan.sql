ALTER TABLE order_delivery_documents
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'replaced', 'removed'));

ALTER TABLE order_delivery_documents
  ADD COLUMN replaced_by TEXT;

UPDATE order_delivery_documents
SET status = 'replaced'
WHERE id IN (
  SELECT older.id
  FROM order_delivery_documents older
  JOIN order_delivery_documents newer
    ON newer.order_id = older.order_id
   AND (
     newer.uploaded_at > older.uploaded_at
     OR (newer.uploaded_at = older.uploaded_at AND newer.id > older.id)
   )
);

CREATE UNIQUE INDEX idx_one_active_delivery_challan_per_order
  ON order_delivery_documents(order_id)
  WHERE status = 'active';

CREATE INDEX idx_delivery_challan_history
  ON order_delivery_documents(order_id, uploaded_at DESC);
