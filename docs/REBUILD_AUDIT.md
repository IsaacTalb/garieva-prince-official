# Rebuild audit

## Preservation and inspection

The working tree was clean before removal. The original complete commit is
`794f465598ee6e4caee0c2d78ac61c72ec4ff340`, preserved by the local branch
`legacy/pre-rebuild`. `.git` and existing history remain intact. No reset,
history rewrite, remote deletion, push, or production data mutation was performed.
The initial rebuild was created on the existing `work` branch, then committed
and pushed as `codex/garieva-prince-foundation` at the user's request. The backup
branch was also pushed. The subsequent UI update follows the user's explicit
authorization to match the reference layout, while retaining GP content/auth.

Inspected all tracked application source, APIs, libraries, types, configuration,
agent instructions, documentation, history, and static-asset inventory before
removal. No useful preexisting user changes or local env files were present.
The old code had a client-rendered temporary mosaic storefront, Clerk sessions,
a permissive empty-admin-list fallback, sequential multi-service product writes,
delete/recreate variant updates, and ambient vendor types masking real SDK types.
Those patterns were replaced, not retained as the new architecture.

## Reference review

Read the separate reference checkout at commit
`77c8bd94e9136bcc077a4305bd53c179c200fa30` from
`https://github.com/IsaacTalb/wildsoulclub` before implementing. It was cloned
outside the target checkout, under `/tmp`, and is not a target dependency.

Reviewed its manifests/docs, `src/db/schema.sql`, server catalog/collection/drop
repositories, cart state, order routes, admin product/payment routes, upload
helper/endpoint, and transactional inventory/checkout/payment migrations.
The useful ideas are normalized catalog relations, stable variant IDs, immutable
R2 keys, public DTOs, server-authoritative totals, row locks, atomic checkout,
exactly-once restocking, payment/fulfillment separation, and audit history.

We adapted those architectural principles through fresh implementation and a
phase plan. No reference source files, brand assets, wording, data, or auth code
were copied. The reference's provider-auth mirroring, browser Supabase client,
product-level stock duplication, and product/media mutation approach were not
carried over. Checkout and payment review are future services, not copied endpoints.

## Retained files

- `.git` and all history: untouched.
- `AGENTS.md`, `CLAUDE.md`: repository-specific development guidance.
- `eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts`: compatible tooling.
- `.gitignore`: retained and extended only to ignore the local npm cache.
- `package.json`, `package-lock.json`: rewritten dependencies and consistent lock.
- `tsconfig.json`: retained strict TypeScript settings, changed alias/source scope.
- `README.md`, `.env.example`: replaced with current GP-only docs/configuration.

No legacy application source or temporary static assets were retained.

## Removed files

- `app/api/admin/product-images/[id]/route.ts`
- `app/api/admin/products/[id]/route.ts`
- `app/api/admin/products/route.ts`
- `app/favicon.ico`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `lib/auth/admin.ts`
- `lib/env.ts`
- `lib/products/form-data.ts`
- `lib/r2/client.ts`
- `lib/supabase/admin.ts`
- `proxy.ts`
- `public/file.svg`
- `public/globe.svg`
- `public/hero-image/hero-1.webp`
- `public/hero-image/hero-2.webp`
- `public/hero-image/hero-3.webp`
- `public/hero-image/hero-4.webp`
- `public/hero-image/hero-5.webp`
- `public/hero-image/hero-6.webp`
- `public/hero-image/homepage-bg.webp`
- `public/next.svg`
- `public/product-image/beach-slide/SLF003-1005-1.webp`
- `public/product-image/beach-slide/SLF003-1005-3.webp`
- `public/product-image/beach-slide/SLF003-1005-7.webp`
- `public/product-image/beanie-hat/GB_v2_1_LIZ.webp`
- `public/product-image/hoodie/REVERSEHOODIE_LIME_FRONT.webp`
- `public/product-image/jogger/REVERSEJOGGER_IRIS_CINCHEDFRONT.webp`
- `public/product-image/phone-cover/IPHONE_16_PRO_SUPER_BLUE_RIGHT_29689_27.webp`
- `public/product-image/short-pant/SLB021-3010_BACK.webp`
- `public/product-image/sock/IMG_1743-2.webp`
- `public/product-image/sock/SLOUCHSOCK_LIME.webp`
- `public/sample-product-1.svg`
- `public/sample-product-2.svg`
- `public/sample-product-3.svg`
- `public/vercel.svg`
- `public/window.svg`
- `types/database.ts`
- `types/vendor.d.ts`

## New foundation

`src/app`, domain components, server-only Auth0/PostgreSQL/R2 boundaries, Zod
schemas, ownership identifiers and future service boundaries; two database
migrations; schema/PostgreSQL tests; CI; Node/npm tooling pins; architecture and
implementation documentation. Original editorial typography replaces temporary
photography/product samples. No invented inventory, orders, or payment results
are displayed.

## Verification scope

Normal npm installation and frozen npm installation completed successfully.
Production compilation/prerendering and TypeScript checks passed without provider
credentials. Lint passed. Five tests passed, including applying both migrations
and testing identity/variant constraints and denied browser-role access in isolated
PostgreSQL. Fifteen production-server HTTP checks passed: public pages and CSS delivery,
closed integration boundaries, and removed legacy APIs/assets returning 404.
No external provider integration or production deployment was claimed. Database
migrations were not applied remotely. No secret values were added to repository
files; examples are blank and test credentials are deterministic non-live fixtures.

Next: configure development providers, then implement authorized catalog/admin
operations and media finalization before checkout. See `IMPLEMENTATION_PLAN.md`.
