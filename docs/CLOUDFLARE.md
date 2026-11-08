# Cloudflare Workers + D1 Setup Guide

## Overview

This guide covers setting up Cloudflare Workers with D1 database binding for the Garieva Prince application.

D1 is the primary and only database runtime for this application.

---

## Local Development Setup

### Prerequisites

- Node.js 20+ installed
- npm or pnpm available
- Wrangler CLI (install with `npm i -g wrangler`)

### Initial Setup

```bash
# Install Wrangler globally
npm install -g wrangler

# Initialize Wrangler configuration
npx wrangler init
```

### Local D1 Development Database

Create a local development database using SQLite:

```bash
# Create development database
wrangler d1 create garieva-prince-dev

# Get the local binding URL
wrangler d1 execute garieva-prince-dev --local="sqlite://dev.db" --command="SELECT name FROM sqlite_master WHERE type='table';"

# Run migrations against local database
cp cloudflare/migrations/0001_core.sql ./migrations.sql
wrangler d1 execute garieva-prince-dev --local="sqlite://dev.db" --file=./migrations.sql
```

### Development Commands

```bash
# Run application with Next.js dev server
npm run dev

# Execute D1 SQL in local development database
wrangler d1 execute garieva-prince-dev --local="sqlite://dev.db" --command="<your sql>"

# List all tables in local database
wrangler d1 execute garieva-prince-dev --local="sqlite://dev.db" --command="SELECT name FROM sqlite_master WHERE type='table';"

# Drop and recreate development database (development only!)
wrangler d1 delete garieva-prince-dev --yes
```

### Building for Cloudflare

```bash
# Build Next.js application
npm run build

# Export for deployment
npx wrangler deploy --outdir=./dist

# Preview locally
cd ./dist && npx serve .
```

---

## Production Deployment

### Create Production Database

```bash
# Create production database (Cloudflare)
wrangler d1 create garieva-prince-prod

# Get database ID for bindings
wrangler d1 list
```

### Run Migrations to Production

```bash
# Apply migrations to production database
wrangler d1 execute garieva-prince-prod --file=./cloudflare/migrations/0001_core.sql
```

### Deploy to Cloudflare

```bash
# Build application
npm run build

# Deploy with Wrangler
npx wrangler deploy

# Or use vercel for Next.js deployment
vercel --prod
```

---

## D1 Database Queries

### Basic Query Examples

```bash
# Count all users
wrangler d1 execute garieva-prince-prod --command="SELECT COUNT(*) FROM users;"

# Get recent orders
wrangler d1 execute garieva-prince-prod --command="SELECT id, order_number, customer_email FROM orders ORDER BY created_at DESC LIMIT 10;"

# Insert test user
wrangler d1 execute garieva-prince-prod --command="INSERT INTO users (id, email) VALUES ('test-user-id', 'test@example.com');"
```

### Using TypeScript/Node.js Client

```bash
# Install D1 client for Node.js applications
npm install @cloudflare/workers-types

# Example usage in Next.js server functions
import { db } from '@myapp/db';

export async function GET() {
  const users = await db.prepare('SELECT id, email FROM users').all();
  return Response.json(users);
}
```

---

## R2 Storage Setup (Optional)

### Create R2 Bucket

```bash
# Create public media bucket
wrangler r2 bucket create garieva-prince-media-public

# Create private bucket for user uploads
wrangler r2 bucket create garieva-prince-media-private

# Get bucket info
wrangler r2 bucket list
```

### Upload Files

```bash
# Upload to R2
npx wrangler r2 object upload ./image.jpg --to-gc=false garieva-prince-media-public test-image.jpg
```

---

## Environment Variables

### Development (.env.local)

```bash
NODE_ENV=development

# D1 Database (local SQLite for development)
DATABASE_URL=sqlite:./dev.db

# Auth0 (transitional - remove when D1 auth is ready)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# R2 (optional - Cloudflare endpoint)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_BUCKET_NAME=garieva-prince-media-public
R2_PRIVATE_BUCKET_NAME=garieva-prince-media-private
R2_PUBLIC_BASE_URL=https://your-cdn.r2.cloudflarestorage.com

# Brevo Email
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@garieva-prince.com
```

### Production (.env.production)

```bash
NODE_ENV=production

# D1 Database (Cloudflare production)
DATABASE_URL=cloudflare:D1:your-database-id

# Auth0 credentials
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# R2 bindings (will use Cloudflare native bindings in Worker)
R2_ACCOUNT_ID=...
```

---

## Migration Checklist

### Phase 1: Development Ready ✅
- [x] Local D1 development setup documented
- [x] Migration SQL files created for D1 compatibility
- [ ] Wrangler configuration complete
- [ ] Database abstraction layer implemented

### Phase 2: Production Boundaries 🔄
- [ ] Create production D1 database
- [ ] Run migrations on production D1
- [ ] Configure R2 buckets (if using Cloudflare-native)
- [ ] Update wrangler.toml with production bindings
- [ ] Test all routes with D1-bound queries

### Phase 3: Auth Migration 🔄
- [ ] Remove @auth0/nextjs-auth0 dependency
- [ ] Implement custom session management
- [ ] Update email verification flow to use Brevo + D1
- [ ] Remove PostgreSQL runtime

---

## Testing Checklist

Run these tests after each change:

```bash
# TypeScript compilation
npm run typecheck

# Linting
npm run lint

# Next.js build validation
npm run build

# Test suite (if available)
npm test
```

---

## Troubleshooting

### Database connection errors

- Ensure `DATABASE_URL` is set correctly in .env
- For local development, use SQLite: `sqlite:./dev.db`
- For production, use Cloudflare D1 binding

### Wrangler commands not found

- Install Wrangler globally: `npm install -g wrangler`
- Check version: `wrangler --version` (should be 3.x)

### D1 migrations failing

- Ensure SQLite syntax is used (no PostgreSQL-specific features)
- Check foreign key constraints are compatible
- Run migrations in correct order (0001_core.sql first)

---

## Next Steps

After D1 foundation is complete:

1. Remove PostgreSQL runtime (`postgres` package)
2. Implement Cloudflare-native session storage
3. Migrate all queries from PostgreSQL to D1
4. Remove Auth0 dependencies
5. Test end-to-end with Brevo email flows

---

## Support

For issues with Cloudflare Workers or D1:
- See [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- See [D1 documentation](https://developers.cloudflare.com/d1/)
- Check `docs/ARCHITECTURE.md` for overall architecture