# Orders boundary

Reserved for authoritative price calculation, idempotent checkout, inventory
reservation, payment review, and fulfillment. Never accept client totals or
consume inventory through separate HTTP/database operations. See the commerce
phase in `docs/IMPLEMENTATION_PLAN.md`. No checkout endpoint is exposed yet.
