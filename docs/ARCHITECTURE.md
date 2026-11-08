# Garieva Prince architecture

## Decision

PR #3 established the tested storefront and account/admin presentation under `src/`.
That structure is retained.

The final backend direction is now:

```
Next.js
  |
Cloudflare Worker
  |------ D1
  |------ R2
  |
Brevo
  |
NTAG 424 DNA verification/provisioning
```

Auth0 and PostgreSQL code merged in PR #3 are transitional only. They remain until
the D1/custom-auth replacement is fully implemented and build-tested. New features
must not deepen those dependencies.

## Application layout

```
src/
  app/
  components/
  lib/
    auth/
    db/
    email/
    nfc/
    orders/
    ownership/
    r2/
  schemas/
  types/

cloudflare/
  migrations/
```

## Authentication target

Custom passwordless email verification:

```
email
 -> generate 6-digit OTP
 -> hash OTP
 -> store hash + expiry in D1
 -> Brevo sends code
 -> verify code
 -> create/resolve user
 -> generate opaque session token
 -> store only token hash
 -> Secure + HttpOnly + SameSite cookie
```

Required protections:
- rate limit OTP issuance and verification
- newest-code-only or explicit invalidation policy
- short expiry
- attempt limits
- single use
- generic error messages
- no browser-trusted user IDs
- admin authorization from D1 roles

## Commerce identity model

A product model is not an individual garment.

```
products
  -> product_variants
      -> product_items
          -> nfc_tags
          -> ownership_claim_codes
          -> ownerships
```

Example:
- Product: Anniversary Jersey
- Variant: Black / L
- Physical item: GP001
- NFC: one NTAG 424 DNA
- Current owner: one active ownership record

There must be only one current owner per physical item.

## NFC

NFC proves the physical tag/item association. It does not by itself grant ownership.

Target NTAG 424 DNA flow:
1. receive factory-default/unlocked tag
2. read and verify chip
3. associate UID with product_item
4. provision security/SDM using a controlled tool
5. pre-install QA
6. install into garment
7. post-install QA
8. customer tap hits verification endpoint
9. backend verifies secure dynamic data
10. product passport is displayed

AES key material must never be committed to Git, exposed to browser code, or stored
as plaintext application data.

## Ownership

Ownership is append-only history:
- original purchase
- resale
- transfer
- gift
- admin assignment

A transfer ends the previous current row and creates a new current row. The product
item and NFC identity do not change.

## Payment and claim

```
order
 -> payment proof
 -> admin approval
 -> allocate physical item
 -> activate claim code
 -> Brevo confirmation email
 -> delivery
 -> NFC tap
 -> claim code
 -> ownership
```

Payment approval and claim operations must be idempotent.

## Storage

R2 stores:
- public product media
- private profile images unless explicitly published
- payment proofs
- delivery/challan documents
- resale media

Persist object keys, not signed URLs.

## Migration path

1. Keep PR #3 storefront/UI stable.
2. Add D1 schema and Brevo/auth primitives.
3. Implement Worker/D1 repository layer.
4. Implement OTP request/verify/session endpoints.
5. Move catalog/account/admin reads from PostgreSQL to D1.
6. Replace Auth0 route/session dependencies.
7. Remove Auth0/PostgreSQL packages and Supabase migrations.
8. Move R2 access to Cloudflare-native bindings.
9. Add ownership/NFC/resale workflows.
10. Run lint/typecheck/tests/build before merging each major phase.
