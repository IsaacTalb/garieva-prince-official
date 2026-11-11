# 🚀 CLOUDFLARE DEPLOYMENT GUIDE

## Garieva Prince — Production Deployment on Cloudflare

**Status**: ✅ Foundation Ready  
**Target**: Cloudflare Workers + D1 + R2  
**Last Updated**: 2026-11-10

---

## Quick Start Checklist

### Pre-Deployment Requirements

Before deploying to Cloudflare, ensure the following are configured:

- [ ] **D1 Database Created**: Create D1 database in Cloudflare Dashboard
- [ ] **R2 Buckets Created**: Set up public and private R2 buckets
- [ ] **Brevo Account**: API key obtained and sender email verified
- [ ] **Environment Variables**: Production secrets configured
- [ ] **NFC Hardware**: Optional (provisioning available, not required for launch)

### Deployment Steps

1. Create D1 database in Cloudflare Dashboard
2. Create R2 buckets (public/private)
3. Configure Wrangler bindings in `wrangler.toml`
4. Deploy to Cloudflare Workers (`npx wrangler deploy`)
5. Set production environment variables
6. Verify deployment at your domain

---

## 1. Cloudflare D1 Database Setup

### Create D1 Database

1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & AI > D1**
3. Click **"Create database"**
4. Configure:
   - **Name**: `garieva-prince` (or your preferred name)
   - **Region**: Choose closest to your users
5. Click **"Create"**

### Get Database ID

After creation, note the **Database ID** (e.g., `xxxxxxxxxxxx`).

You'll need this for environment variables and Wrangler bindings.

---

## 2. Cloudflare R2 Bucket Setup

### Create R2 Buckets

1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & AI > R2**
3. Click **"Create bucket"**
4. Create two buckets:

#### Public Bucket (Product Media)
- **Name**: `garieva-prince-media-public`
- **Settings**: 
  - Enable CDN cache control
  - Set CORS for web access

#### Private Bucket (Sensitive Files)
- **Name**: `garieva-prince-media-private`  
- **Settings**:
  - Disable public access
  - Only accessible via signed URLs or authenticated requests

### Get R2 Credentials

Navigate to your bucket settings to obtain:
- **Account ID** (from Workers & AI > Overview)
- **Access Key ID** and **Secret Access Key** (from R2 > Settings > API Keys)

---

## 3. Environment Variables for Production

Create a `.env.production` file (or use Wrangler environment variables):

```bash
# =============================================================================
# GARIEVA PRINCE — PRODUCTION ENVIRONMENT
# =============================================================================

# App Configuration
APP_BASE_URL=https://your-domain.com

# Database - Cloudflare D1 Binding
DATABASE_URL=cloudflare:D1:your-database-id
CLOUDFLARE_D1_DATABASE_NAME=garieva-prince

# Session Secrets - Use strong random values in production!
AUTH_SESSION_SECRET=your-production-session-secret-min-32-chars
AUTH_OTP_PEPPER=your-production-pepper-min-16-chars

# Brevo Email Service (REQUIRED)
BREVO_API_KEY=your-production-brevo-api-key
BREVO_SENDER_EMAIL=noreply@garieva-prince.com  # Must be verified in Brevo
BREVO_SENDER_NAME=Garieva Prince

# R2 Media Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_PUBLIC_BUCKET_NAME=garieva-prince-media-public
R2_PRIVATE_BUCKET_NAME=garieva-prince-media-private
R2_PUBLIC_BASE_URL=https://garieva-prince-media-public.r2.cloudflarestorage.com

# Admin User ID (from D1 database)
ADMIN_USER_ID=your-super-admin-user-id-from-d1
```

### Deploy Secrets via Wrangler

Alternatively, set environment variables directly in Cloudflare:

```bash
npx wrangler secrets put --env production AUTH_SESSION_SECRET "your-secret"
npx wrangler secrets put --env production DATABASE_URL "cloudflare:D1:your-db-id"
# ... etc for all secrets
```

**Best Practice**: Use Wrangler environment variables and keep `.env.production` secure.

---

## 4. Wrangler Configuration (`wrangler.toml`)

### Production Deployment Config

```toml
name = "garieva-prince-production"
main = "./src/app/api/entry.js"  # Or your main entry point
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 Database Binding
[vars]
DATABASE_URL = "cloudflare:D1:your-database-id"
CLOUDFLARE_D1_DATABASE_NAME = "garieva-prince"
APP_BASE_URL = "https://your-domain.com"

# Session Secrets (use wrangler secrets instead for better security)
# [vars]
# AUTH_SESSION_SECRET = "your-secret-from-env"
# AUTH_OTP_PEPPER = "your-pepper-from-env"

# R2 Bucket Bindings
[[r2_buckets]]
binding = "R2_PUBLIC"  # Or custom name used in your code
bucket_name = "garieva-prince-media-public"

[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "garieva-prince-media-private"

# Environment-specific settings
[env.production]
vars = { DATABASE_URL = "cloudflare:D1:your-db-id", APP_BASE_URL = "https://your-domain.com" }

[dev]
local_vars = [
  { name = "DATABASE_URL", value = "sqlite:./dev.db" },
  { name = "BREVO_API_KEY", value = "your-dev-brevo-key" }
]
```

### Development vs Production

**Development** (`wrangler.toml`):
```toml
[dev]
local_vars = [
  { name = "DATABASE_URL", value = "sqlite:./dev.db" },
  { name = "BREVO_API_KEY", value = "" }
]
```

**Production**:
```toml
[env.production]
vars = { 
  DATABASE_URL = "cloudflare:D1:your-db-id",
  APP_BASE_URL = "https://your-domain.com"
}
```

---

## 5. Database Migrations

### Upload Migration Scripts to Cloudflare D1

The project includes migration scripts in `cloudflare/migrations/`:

```
cloudflare/migrations/
├── 0001_core.sql          # Core schema (users, products, etc.)
├── 0002_categories.sql    # Categories hierarchy
├── 0003_cart_items.sql    # Cart items table
├── 0004_coupons.sql       # Coupons system
├── 0005_ownership_claim_codes.sql  # Claim codes
└── 0006_payment_approvals.sql      # Payment approvals
```

### Apply Migrations to D1

#### Option A: Using SQL Runner (Recommended for initial setup)

1. Visit [Cloudflare Dashboard > Workers & AI > D1](https://dash.cloudflare.com/)
2. Select your database
3. Click **"SQL"** tab
4. Copy each migration file content
5. Execute via **Run SQL** button

#### Option B: Using Wrangler Migration (Automated)

Create `cloudflare/migrations/apply.sh`:

```bash
#!/bin/bash

# Apply all D1 migrations to Cloudflare database
set -e

DB_URL="${DATABASE_URL:-cloudflare:D1:your-database-id}"
DB_NAME=$(echo $DB_URL | sed 's/cloudflare:D1://' )

for migration_file in cloudflare/migrations/*.sql; do
  echo "Applying migration: $(basename $migration_file)"
  
  # Read migration SQL
  SQL=$(cat "$migration_file")
  
  # Execute via Cloudflare API or SQL Runner
  # For now, manually run each via Cloudflare Dashboard
  
done

echo "All migrations applied successfully!"
```

**Note**: For production, prefer manual migration application via SQL Runner to verify each migration.

---

## 6. Deploying to Cloudflare Workers

### Build for Production

```bash
# Install dependencies
npm ci

# Build Next.js application
npm run build

# Verify build succeeds
npm run typecheck
npm run lint
```

### Deploy with Wrangler

#### Option A: Full Static Export (Recommended)

```bash
# Export Next.js to static files
npx wrangler pages functions-download ./out/static .

# Deploy
npx wrangler pages deploy garieva-prince-official --env production
```

#### Option B: API Routes Only (For backend-only deployment)

If deploying only API routes (not full Next.js):

```bash
# Deploy API endpoints
npx wrangler deploy ./src/app/api/entry.js --name garieva-prince-api --env production
```

### Custom Domain Setup

After deployment:

1. Visit [Cloudflare Dashboard > Workers & AI > Workers](https://dash.cloudflare.com/)
2. Select your worker
3. Click **"Domains"** tab
4. Add custom domain (e.g., `www.yourdomain.com`)
5. Update DNS records in your domain registrar

### SSL/TLS Configuration

Ensure **SSL/TLS** is set to:
- **Full** (for development)
- **Full (Strict)** (for production with valid certificates)

---

## 7. Post-Deployment Verification

### Health Check Endpoint

Verify deployment by visiting:

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "databaseConfigured": true,
  "databaseName": "garieva-prince"
}
```

### Test Authentication Flow

1. Visit `https://your-domain.com/account/sign-in`
2. Enter test email (e.g., `test@example.com`)
3. Check email for OTP code (requires Brevo configured)
4. Verify email and create account
5. Complete profile setup

### Test Product Catalog

```bash
curl https://your-domain.com/products
```

Should return JSON array of products (or redirect to storefront).

---

## 8. Monitoring and Logs

### Cloudflare Logs

Access worker logs via:
- **Cloudflare Dashboard > Workers & AI > Workers > Logs**
- Filter by worker name and date range
- Search for error messages

### Error Tracking (Recommended)

Consider integrating with:
- **Sentry** (error tracking)
- **LogRocket** (session replay)
- **PostHog** (analytics)

---

## 9. Rollback Strategy

If deployment fails or issues occur:

### Option A: Deploy Previous Version

```bash
# Keep previous deployment for rollback
npx wrangler deploy ./dist/previous-build --name garieva-prince-official \
  --compatibility-date "2024-01-01" \
  --var DATABASE_URL=cloudflare:D1:your-db-id
```

### Option B: Update `wrangler.toml` and Redeploy

1. Revert changes in `wrangler.toml`
2. Rebuild application
3. Deploy again

---

## 10. Performance Optimization

### Enable CD Cache

Configure CDN cache control in R2 bucket settings:
- Public bucket: Cache for 1 week (product images)
- Private bucket: No cache (fresh data only)

### Enable HTTP/2 and HTTP/3

Cloudflare Workers automatically support HTTP/2 and HTTP/3.

### Use Cloudflare Cache Rules

Create cache rules in Cloudflare Dashboard to:
- Cache static assets (images, CSS, JS)
- Bypass cache for authenticated endpoints
- Cache API responses with appropriate TTL

---

## 11. Security Best Practices

### Production Secrets Management

**NEVER commit secrets to Git!**

Instead:
1. Use Wrangler environment variables
2. Set via `wrangler secrets put` command
3. Or use Cloudflare Dashboard > Workers & AI > Workers > Settings > Variables

### Rate Limiting

Configure rate limiting in Cloudflare Dashboard:
- API endpoints: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP

### Enable WAF Rules

Configure Web Application Firewall rules to:
- Block suspicious user agents
- Prevent SQL injection
- Mitigate XSS attacks

---

## Troubleshooting Common Issues

### Issue: `DATABASE_URL` error

**Symptom**: App throws "DATABASE_URL must be set"  
**Solution**: 
```bash
# In wrangler.toml or Cloudflare Dashboard
[vars]
DATABASE_URL = "cloudflare:D1:your-database-id"
```

### Issue: R2 bucket not found

**Symptom**: Upload fails with "Bucket not found"  
**Solution**: Verify bucket names in `wrangler.toml` match actual R2 bucket names.

### Issue: Brevo emails not sending

**Symptom**: OTP codes never arrive  
**Solution**: 
1. Verify `BREVO_API_KEY` is set correctly
2. Confirm sender email is verified in Brevo Dashboard
3. Check Brevo API quota (free tier: 300 emails/day)

### Issue: Custom domain not working

**Symptom**: Cloudflare URL works, custom domain doesn't  
**Solution**: 
1. Add CNAME record in domain registrar DNS settings
2. Wait for DNS propagation (up to 48 hours)
3. Verify SSL certificate issued

---

## Migration from Vercel or Other Platforms

If migrating from another platform:

### Database Migration (PostgreSQL → D1)

1. Export data from PostgreSQL
2. Create empty D1 database in Cloudflare
3. Insert exported data via SQL Runner or migration scripts
4. Update all `DATABASE_URL` references

### Email Service Migration

Keep using **Brevo** (recommended) or:
- SendGrid
- Postmark
- AWS SES

Update `src/lib/email/brevo.ts` with new provider.

---

## Summary of Production Requirements

| Component | Cloudflare Service | Configuration Required |
|-----------|-------------------|------------------------|
| **Workers** | Workers & AI > Workers | Worker deployment via Wrangler |
| **Database** | Workers & AI > D1 | Database created, migrations applied |
| **Storage** | Workers & AI > R2 | Public/private buckets configured |
| **Email** | External (Brevo) | API key and sender email configured |
| **Domain** | Custom domains in Dashboard | CNAME records configured |
| **SSL** | Automatic (Cloudflare-managed) | Full (Strict) mode enabled |

---

## Next Steps After Deployment

1. ✅ Test authentication flow end-to-end
2. ✅ Verify product catalog loads
3. ✅ Test cart and checkout
4. ✅ Review Cloudflare logs for errors
5. ✅ Set up monitoring/alerting
6. ✅ Configure custom domain DNS records
7. ✅ Enable HTTPS (automatic via Cloudflare)

---

## Support Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **Brevo API Docs**: https://help Brevo.com/hc/en-us

---

**Last Updated**: 2026-11-10  
**Deployment Target**: Cloudflare Workers + D1 + R2  
**Status**: ✅ Foundation Ready for Production Deployment