# Garieva Prince

The clean foundation for an independent premium fashion and NFC digital ownership
platform. This release establishes architecture, identity, a catalog schema, and
a storefront shell. Purchases, payment review, ownership claims, and resale are
not yet implemented.

## Development

Use Node.js 24 (pinned in `.node-version`) and npm. Cloud tasks already have an
isolated checkout; use it rather than creating a worktree unless requested.

```sh
npm install
npm run dev
```

Public pages build and run without credentials. Account and admin access fail
closed when integrations are absent. `/api/health` is liveness only. No sample
products are seeded. The catalog is empty without a database; configured database
failures surface as failures rather than being silently treated as empty data.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The regenerated lockfile supports frozen installs. `.npmrc` places the package
cache in ignored `.npm-cache/`, including on restricted cloud machines. Tests
validate schemas and migrations using isolated PostgreSQL through PGlite; they
never connect to a live provider.

## Integrations

Copy `.env.example` to ignored `.env.local` and fill in real settings only for
integrations you are using. Authentication is Auth0; Supabase is PostgreSQL only;
media uses separate public/private Cloudflare R2 buckets. Deployment targets
Vercel's Next.js preset with Node.js 24.x.

Apply migrations in order to a **new, dedicated GP database**. They are not a
conversion script for the legacy production database. Installation, builds, and
CI never apply production migrations.

See [Architecture](docs/ARCHITECTURE.md), [Implementation plan](docs/IMPLEMENTATION_PLAN.md),
and [Rebuild audit](docs/REBUILD_AUDIT.md). The original implementation remains in
Git history and local `legacy/pre-rebuild`; history was not rewritten and no
branch was pushed by this phase.
