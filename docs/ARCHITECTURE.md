# Garieva Prince architecture

## Scope

This is an independent premium fashion and NFC digital ownership foundation,
replacing the previous application. New typographic artwork and house copy
establish a separate identity. No reference logos, photography, products, content,
or authentication were imported. Final brand artwork/copy need business approval
before launch.

Implemented: storefront shell and honest empty states; Auth0 SDK wiring;
server-only application identity and administrator resolution; public catalog
read repository; Zod boundaries; separate-bucket R2 signing primitives; identity
and catalog migrations; CI and isolated PostgreSQL tests.

Product detail reads and searchable catalog presentation are available. Cart,
wishlist, checkout, and admin sections have presentation-only unavailable states.
Deferred: catalog management, collection/drop publication, archive pricing,
commerce mutations, orders, payment review, inventory ledger, email,
NFC verification, ownership claims/transfers, and resale.

## Stack and boundaries

Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Lucide icons, Auth0 Next.js
SDK 4, PostgreSQL through `postgres`, AWS S3 SDK for R2, and Zod 4. Real dependency
types replace ambient vendor stubs. Add shadcn/ui when accessible forms/dialogs
warrant it; no unused component suite is installed in the foundation.

```text
src/
  app/
    (store)/         home, products, collections, drops, archive-sales
    account/         authenticated personal space
    ownership/       public explanation; claims deferred
    resale/          public introduction; marketplace deferred
    admin/           application-role protected operations shell
    api/             liveness and authenticated account read
  components/
    storefront/ account/ ownership/ admin/ shared/
  lib/
    auth/            Auth0 client, sessions, authorization guards
    db/              PostgreSQL client, user resolution, catalog reads
    r2/              separate-bucket media infrastructure
    email/ nfc/ orders/ ownership/  documented future service boundaries
  schemas/           Zod validation and inferred types
  types/             ownership identifiers
  proxy.ts           Auth0 interception and rolling sessions
supabase/migrations/ ordered database-only migrations
tests/               validation and isolated PostgreSQL invariants
docs/                architecture, phase plan, rebuild audit
```

Pages/layouts are Server Components. Client islands handle the responsive header,
route-aware footer, admin navigation, and Next.js error boundary. Database and
authorization checks remain on the server.
`server-only` prevents session, database, and R2 modules entering client bundles.

## Auth0 and application identity

Auth0 owns authentication and encrypted HTTP-only session cookies. The SDK
handles `/auth/login`, `/auth/callback`, and `/auth/logout` via Next.js 16
`src/proxy.ts`; broad matching supports rolling sessions. Its optional access
token endpoint is disabled. Invalid/missing auth configuration yields a 503 on
auth endpoints, while public pages remain available. Credentials are never
invented or replaced with a fake authentication mode.

Configure an Auth0 **Regular Web Application**. Register
`http://localhost:3000/auth/callback` as a local allowed callback URL and
`http://localhost:3000` as an allowed logout URL. For production, register the
actual HTTPS origin plus `/auth/callback` and the HTTPS origin for logout.
`APP_BASE_URL` must be the exact deployment origin. Preview deployments need
separately registered URLs and scoped credentials.

`users.id` is a generated UUID; `auth0_sub` is a unique provider mapping. All
internal user foreign keys reference `users.id`. The table includes email,
display name, username, phone, avatar URL, visibility, and timestamps. Profiles
default to private. Only verified email claims are used during initial user
provisioning; existing application profile fields are not overwritten at login.
Case-insensitive email uniqueness causes duplicate-email subjects to fail closed,
never silently link accounts. Explicit account linking and recovery are later work.

`user_roles(user_id, role)` controls administration. New users have no role.
There is no provider-subject FK, automatic first-user admin, email allowlist,
or public role setter. Every protected service/action/route must call
`requireUser()` or `requireAdmin()`; proxy/layout coverage alone is insufficient.
The account API returns only internal ID, display name, and visibility with
`private, no-store`, omitting provider subjects and contact data.

After first sign-in provisions a user, a trusted database operator can bootstrap
an administrator using their application UUID:

```sql
insert into public.user_roles(user_id, role)
values ('APPLICATION_USER_UUID', 'admin');
```

Never give the runtime role permission to write `user_roles`. Future role
management requires explicit permissions and audit records.

## Supabase as PostgreSQL only

Direct server-side parameterized queries replace Supabase client auth patterns.
There is no browser database client, Supabase Auth, `auth.users` reference,
auth trigger, anon key, or Supabase Storage dependency. Verified PostgreSQL TLS
is mandatory (`verify-full`); install the provider CA if necessary rather than
disabling verification.

For Vercel, use a Supabase transaction pooler URL. Prepared statements are
disabled and each process has a three-connection maximum. Size deployment
concurrency against provider limits. Connections are lazy, not build-time.
The dynamic public catalog selects only published, non-deleted public fields.
Database failures are not hidden as empty catalog results.

The migrations create eight tables:

| Table | Purpose |
| --- | --- |
| users | Application-owned, private-by-default identity |
| user_roles | Deny-by-default administrator membership |
| collections | Editorial grouping and publication state |
| drops | Scheduled releases and lifecycle windows |
| products | Catalog identity, currency, lifecycle, soft deletion |
| collection_products | Many-to-many collection membership |
| product_variants | Stable SKU, options, minor-unit price, stock/reservations |
| product_media | Public object keys, alt text, ordering |

Every sellable item has a stable variant ID. Money is integer minor units with
a currency per product and a safe-integer bound. Stock is variant-owned, with
no duplicate product-level balance. Reservations cannot exceed on-hand stock.
SKU and case-insensitive option combinations are unique. Physical garment
instances will be separate from variant stock. No sample data is seeded.

All tables enable RLS with no browser policies. Grants to PUBLIC, `anon`,
`authenticated`, and `service_role` are revoked, including Supabase defaults.
RLS does not implement Auth0 authorization; the trusted server verifies identity
and access. The table owner can use the schema for initial development. In
production, a database operator must provision a dedicated **server-only** login
with BYPASSRLS and narrow table/column grants, without schema-owner privileges.
Never expose that login to the browser. Example grants for the current release,
after securely provisioning the actual runtime role:

```sql
grant usage on schema public to garieva_runtime;
grant select on public.users, public.user_roles, public.products, public.product_media to garieva_runtime;
grant insert (auth0_sub, email, display_name) on public.users to garieva_runtime;
grant update (auth0_sub) on public.users to garieva_runtime;
```

The subject-only conflict update atomically returns an existing user. Triggers
maintain timestamps. These grants do not enable catalog or role mutations.
Review future service grants separately. Only the trusted runtime login uses
BYPASSRLS; never browser roles.

Apply migrations in order to a **new dedicated GP database** through Supabase
CLI or the SQL editor. Inspect `supabase db push --dry-run` on a linked development
project before applying. Migration credentials are separate from runtime
credentials. This task did not apply remote migrations or convert legacy data;
retaining legacy production data requires a separate migration/rollback plan.

## Cloudflare R2

Use separate public/private buckets. Only product media is public; profiles and
order/payment media are private by default. Internal helpers create immutable
UUID keys under an application owner ID, constrain image types and declared
sizes to 10 MiB, and provide five-minute upload / one-minute private read URLs.
Private objects receive no public URL and use `private, no-store`; public product
media uses immutable cache headers. Persist keys, never signed URLs.

These are signing primitives, **not authorized upload endpoints**. Before
exposing them, implement owner/purpose authorization, CSRF checks, rate limits,
quotas, origin-restricted CORS, magic-byte/actual-size validation, image
re-encoding, and pending-object/finalization records. The helper's declared size
and MIME validation are not proof of uploaded bytes. Match finalization to the
server-issued owner/key; never accept arbitrary client buckets/keys. Private
reads require order/profile access checks. Public avatar publication, if added,
requires explicit consent.

R2 writes and SQL are not one transaction. Add pending/finalized media states,
idempotent orphan cleanup and an outbox before mutations. Do not delete the only
object and then risk failing the database update.

## Later commerce and ownership contracts

The reference informed server-authoritative pricing, atomic checkout,
row-locked inventory, stable variants, separate payment/fulfillment states,
auditable admin operations, and durable R2 keys. Its authentication, branding,
content, and products were not imported. See the audit for inspected paths/ref.

Checkout accepts variant IDs and quantities, never authoritative client totals.
One transaction locks variants deterministically, checks publication/drop/archive
timing, calculates prices, reserves stock, snapshots lines, and stores an
idempotent result. Payment review locks payment/order/reservations, validates
transitions, audits the reviewer, and releases/consumes inventory exactly once.
Payment receipt submission is not approval; fulfillment is independent.

Ownership attaches to a serialized garment, not a SKU or Auth0 subject. A tag
UID/static URL is not proof. Hardware/cryptographic verification must be selected
before claims are implemented. Replay protection, issuance eligibility, single
active owner, consensual transfers, and append-only history are prerequisites.
Resale depends on those protections, not just a listing form.

## Configuration and deployment

| Integration | Variables |
| --- | --- |
| Auth0 | AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL |
| PostgreSQL | DATABASE_URL |
| R2 | R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BUCKET_NAME, R2_PRIVATE_BUCKET_NAME, R2_PUBLIC_BASE_URL |

All sensitive values remain server-side. Cookie encryption, database passwords,
and AWS signing require raw runtime credentials; HTTPS-proxy placeholders cannot
supply them. Configure securely in ignored `.env.local` or environment settings,
never chat/source. `.env.example` contains blank credential fields. Provider
egress needs the actual Auth0 tenant, pooler host/port, R2 endpoint, and public
media hostname; no tenant-specific hostnames are guessed.

Vercel: Next.js preset, Node.js 24.x, `npm ci`, `npm run build`. Scope credentials
separately to development/preview/production. Schema deployment is separate from
Vercel builds. CI checks frozen install, lint, type generation/check, isolated
PostgreSQL/schema tests, and a credential-free production build. Live Auth0,
Supabase TLS/permissions, R2 uploads, browser interaction, and deployment remain
integration checks before production launch.

## Storefront UI alignment

At the user's request, the presentation now follows the reference UI: fixed
48px glass header, centered GP wordmark, desktop shop dropdown and action icons,
mobile modal navigation/search, full-screen collection hero, floating product
showcase, white surfaces, Helvetica/Arial typography, rounded cards/buttons,
brand signoff, and four-column footer. The earlier cream/burgundy editorial
layout was removed. Reference branding, proprietary font files, photographs,
product data, contacts, authentication, and API implementation were not imported.

No GP campaign photograph is configured, so the hero uses the reference's dark
gradient fallback. Real published GP products use the existing product-media
relation and configured R2 public base URL, not sample merchandise. Missing
photography gets an explicit placeholder. Search is parameterized on the server.
The public catalog query now needs SELECT on product_media as well as products.

Admin pages reuse the sidebar/top-bar layout only after server-side authorization;
unimplemented sections do not expose mutation controls or invented metrics.
Account details stay server-rendered and read-only. Checkout does not collect
payment details or create orders; all purchasing controls remain disabled.
