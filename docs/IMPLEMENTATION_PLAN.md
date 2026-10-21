# Implementation plan

## Phase 1 — Foundation (this release)

Preserve legacy history/branch; replace the application under `src/`; establish
GP's own presentation; wire Auth0 and application UUID identity; add server-only
PostgreSQL and R2 boundaries; create catalog/identity migrations, validation,
tests, CI, and documentation. Keep incomplete business flows visibly unavailable.

Exit checks: normal/frozen npm installs, lint, typecheck, five meaningful tests,
production build and HTTP smoke checks, no copied brand assets or obsolete auth,
and no real credentials in source. Live provider integration is separate because
no tenant/database/bucket settings were supplied.

## Phase 2 — Catalog and operations (next)

1. Configure a development Auth0 tenant, new Supabase project, least-privilege
   runtime role, and separate R2 buckets. Apply migrations and verify login/logout,
   user provisioning, duplicate-email collisions, and administrator denial.
2. Add authorized catalog/collection/drop CRUD and Zod forms. Use shadcn/ui where
   accessible dialogs, inputs, tables, and confirmation flows are useful.
3. Add public detail/filter/pagination reads, collection/drop publication and
   server-enforced release timing. All imagery/content/data must belong to GP.
4. Add pending/finalized media records, authorized uploads, actual-byte image
   validation, quotas, cleanup jobs, and public product rendering.
5. Add inventory movements and append-only admin audit records. Preserve variant
   IDs; archive instead of deleting referenced history. Model dated archive sales
   with variant price overrides rather than unrelated product booleans.

Acceptance: real GP-only catalog; authorization on every mutation; upload
tampering rejection; cleanup recovery; stable SKUs/options; one stock authority;
keyboard/mobile checks; approved brand content; repeatable migration/rollback.

## Phase 3 — Commerce and manual payment verification

Persist client cart variant IDs and quantities; displayed prices are advisory.
Define currency/rounding, shipping, taxes, coupons, payment methods/instructions,
and expiry rules with the business before implementation.

Add orders, immutable item/address snapshots, inventory reservations/movements,
payment submissions/reviews, audit events, and a transactional email outbox.
User foreign keys reference `users.id`. Begin with authenticated checkout; decide
guest access separately with scoped hashed tokens if required.

Checkout must use one transaction: deterministic row locks; availability and
release/sale checks; authoritative price/shipping/tax computation; stock
reservation; snapshots; unique idempotency key/result; payment reference tied to
the actual total. Retries cannot create extra orders or consume extra stock.

Separate payment state (`awaiting_proof`, `under_review`, `approved`, `rejected`,
`expired`) from fulfillment (`unfulfilled`, `processing`, `shipped`, `delivered`,
`cancelled`). Define allowed transitions in one service. Review locks the payment,
order and reservations; repeated review is rejected. Prevent payment rejection
after shipping except through an explicit refund process. Expiry/cancellation
release reservations exactly once. Enqueue notifications in the transaction.

Acceptance: last-item concurrency, price changes, idempotent retries, expiry/review
races, private receipt access, order-owner checks, double-restock prevention,
failed-upload recovery, auditable approval, and approved payment instructions.

## Phase 4 — NFC and digital ownership

Select secure NFC hardware and cryptographic scheme first. Provision secrets
through managed infrastructure. Add garment instances, NFC tags, verification
events, claims, ownership events, and transfers. Enforce one active owner with
database constraints; preserve append-only history independent of catalog edits.

Verify scan cryptography, freshness/replay counters, activation, and initial
purchase/issuance eligibility on the server. A UID or URL never establishes a
claim. Transfers require current-owner authorization, recipient acceptance,
expiry, audit evidence, and transactional race protection. Public passports and
profiles must respect visibility consent and omit customer/order information.

Acceptance: forged tags, copied URLs, replay, double claims, lost-tag recovery,
simultaneous transfers, revoked accounts, privacy checks, and a security review
before making production authenticity claims.

## Phase 5 — Verified resale and launch

Only verified owned garments can be listed. Decide custody, settlement, shipping,
fees, disputes, refunds, and transfer triggers before implementation. Reserve
listings and transfer ownership atomically on the agreed settlement event.

Complete live integration/browser/load checks, content approval, accessibility,
error monitoring, backups/restore drill, retention/export, secret rotation,
deployment protection, and migration rollback. Production launch requires business
approval. This foundation task does not deploy or mutate production databases.
