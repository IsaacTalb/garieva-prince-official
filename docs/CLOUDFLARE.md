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
- [ ] **NFC Hardware**: Optional; the admin workflow is a scaffold, and reader/SDM integration remains pending

### Deployment Steps

1. Create a D1 database and put its ID in the matching `wrangler.toml` binding.
2. Apply the SQL files in `cloudflare/migrations/` to that database.
3. Configure the production secrets listed below with Wrangler.
4. Run `npm run preview` to test the Worker build locally.
5. Run `npm run deploy` to build and deploy the Next.js Worker.

`npm run dev` uses the local SQLite database. Use `npm run preview` to test the
Cloudflare Worker and its D1 binding.

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

## 3. Production Worker Variables and Secrets

Vercel environment variables are not copied to Cloudflare. Configure the
production Worker in **Workers & Pages → garieva-prince-official → Settings →
Variables and Secrets**, or use Wrangler. The checked-in config has
`keep_vars = true`, so dashboard variables are retained on later deployments.

Set these as **Worker secrets** (never commit their values):

- `AUTH_SESSION_SECRET` (at least 32 characters)
- `AUTH_OTP_PEPPER` (at least 32 characters)
- `BREVO_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Generate independent cryptographically random values locally; do not use a
human-readable password or reuse another service's credential. This command
prints 64-character hexadecimal values for both secrets:

```powershell
node -e "const { randomBytes } = require('node:crypto'); console.log('AUTH_SESSION_SECRET=' + randomBytes(32).toString('hex')); console.log('AUTH_OTP_PEPPER=' + randomBytes(32).toString('hex'))"
```

Copy each value directly into its matching Cloudflare Worker secret. Never
commit the values or share them in chat or screenshots.

For each secret, Wrangler prompts for its value:

```powershell
npx wrangler secret put AUTH_SESSION_SECRET --env production
npx wrangler secret put AUTH_OTP_PEPPER --env production
npx wrangler secret put BREVO_API_KEY --env production
npx wrangler secret put R2_ACCESS_KEY_ID --env production
npx wrangler secret put R2_SECRET_ACCESS_KEY --env production
```

Set these as non-secret Worker variables:

- `APP_BASE_URL` — the production site origin
- `BREVO_SENDER_EMAIL` — required and verified in Brevo
- `BREVO_SENDER_NAME`
- `R2_ACCOUNT_ID`
- `R2_PUBLIC_BUCKET_NAME`
- `R2_PRIVATE_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` — the public bucket's custom domain or public URL
- `ADMIN_USER_ID` — the D1 user ID for the configured administrator

`DATABASE_URL` and `CLOUDFLARE_D1_DATABASE_NAME` are already declared in
`wrangler.toml`; D1 access is through the `DB` binding, not a database URL
secret. The local `sql.js` adapter is initialized only for `sqlite:` URLs;
Workers using `cloudflare:D1:` skip its WASM initialization. This application
expects **separate public and private R2 buckets**.
The Vercel variable `R2_BUCKET_NAME` is not used by the app; assign the
existing bucket to one role and create a second bucket for the other. Do not
enable public access on the private bucket.

---

## 4. Wrangler Configuration (`wrangler.toml`)

The checked-in configuration uses OpenNext's `.open-next/worker.js` output, a
D1 binding named `DB`, and `cloudflare/migrations/` for D1 migrations. It now
contains the IDs for the dedicated development and production databases
created for this project. If you recreate either database, update its matching
`database_id`. Production assets, Images, and self-reference service bindings
are declared separately because Wrangler environments do not inherit resource
bindings. The production Worker name and its self-reference are both
`garieva-prince-official`, matching the Worker connected to this repository.

The `nodejs_compat_populate_process_env` compatibility flag is required because
the application reads Worker variables and secrets through `process.env`.
`keep_vars = true` preserves non-secret variables entered in the Cloudflare
dashboard when deploying.

Log into Wrangler and verify the account before managing resources:

```powershell
npx wrangler login
npx wrangler whoami
```

If these databases need to be recreated, use `npx wrangler d1 create` with
their respective names and update the matching IDs in `wrangler.toml`. Keep
development and production databases separate.

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
├── 0006_payment_approvals.sql      # Payment approvals
└── 0007_nfc_verification_events.sql # Public wardrobe consent and replay counters
```

### Apply Migrations to D1

After logging into the Cloudflare account that owns this project's production
D1 database, apply the numbered migrations once:

```powershell
npx wrangler d1 migrations apply DB --remote --env production
```

The `migrations_dir` setting points Wrangler at `cloudflare/migrations/`.
Review the pending migration list and back up production data before applying
schema changes. Do not execute these same files manually in the dashboard SQL
editor and then run Wrangler migrations: manual SQL does not record the
migration state Wrangler uses to avoid reapplying files.

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

### Build and deploy the Next.js Worker

```bash
npm run typecheck
npm run preview
npm run deploy
```

The deployment script builds with `@opennextjs/cloudflare` and deploys the
production Wrangler environment. Do not deploy with `wrangler deploy` directly:
the Worker entry point is generated under `.open-next/`.

The project pins `@opennextjs/cloudflare` to `1.19.0` for compatibility with
Next.js `16.2.10`. Adapter `1.16.0` does not inline Next.js 16.2's
`prefetch-hints.json` manifest and causes Worker requests to fail at runtime.
Keep the adapter and Next.js versions within their declared peer dependency
range when upgrading.

This project uses `src/middleware.ts` with the Edge runtime for its request
hook. Next.js 16 `proxy.ts` uses the Node.js runtime, which the current
OpenNext Cloudflare adapter does not support. Keep the Edge middleware
convention until the adapter supports Node.js Proxy.

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