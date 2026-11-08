# Garieva Prince

Garieva Prince is being rebuilt as a premium fashion, commerce, NFC authenticity,
and digital ownership platform.

## Current status

The storefront/UI foundation from PR #3 is preserved and remains the working base.
PR #4 adds the next architecture layer without discarding that tested UI.

### Target production architecture
- Next.js 16 + React 19 + TypeScript
- Cloudflare Workers for full-stack runtime
- Cloudflare D1 for relational application data
- Cloudflare R2 for product/profile/order media
- Brevo for transactional email
- Custom passwordless email verification and opaque session cookies
- NXP NTAG 424 DNA for physical-garment authenticity and digital identity

### Transitional note
PR #3 introduced Auth0 + PostgreSQL infrastructure. Those modules remain temporarily
so the already-merged application continues to build while the Cloudflare D1/custom
authentication runtime is implemented. They are not the final GP architecture.

Do not add new features that depend on Auth0 or PostgreSQL. New backend work should
target the Cloudflare/Brevo direction.

## Development

Use Node.js 24 and npm.

### Cloudflare Workers + D1 Foundation ✅
The repository has been upgraded to support Cloudflare Workers and D1 database binding.
See [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) for setup instructions.

- Wrangler configuration created at [`wrangler.toml`](./wrangler.toml)
- D1 abstraction layer implemented under [`src/lib/db/d1/`](./src/lib/db/d1/)
- SQLite-compatible migrations converted to [`cloudflare/migrations/0001_core.sql`](./cloudflare/migrations/0001_core.sql)
- Health check and repository functions ready for production binding

## Digital identity model

A catalog product and a physical garment are different records.

```
product
  -> variant
      -> product_item (for example GP001)
          -> NTAG 424 DNA
          -> ownership claim code
          -> ownership history
```

The physical item ID never changes when ownership changes.

## Authentication target

The final GP account flow is:

1. customer enters email
2. Brevo sends a 6-digit code
3. email is verified
4. existing user signs in
5. new user creates profile with name, username and phone
6. server issues an HttpOnly opaque session

OTP values and session tokens must never be stored in plaintext.

## Branch safety

The original pre-rebuild implementation is preserved in `legacy/pre-rebuild`.

See:
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/UI_ALIGNMENT.md`
