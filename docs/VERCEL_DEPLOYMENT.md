# 🚀 VERCEL DEPLOYMENT GUIDE - GARIEVA PRINCE

## Fix Applied: Removed Clerk/Supabase Integration Traces ✅

### What Was Fixed:

1. **Updated `.gitignore`** to exclude `.clerk/`, `.supabase/` folders from commits
2. **Created `.vercelignore`** to prevent Vercel auto-detecting legacy integrations
3. **Updated `next.config.ts`** to disable integration detection and add security headers
4. **Pushed changes to GitHub**: https://github.com/IsaacTalb/garieva-prince-official

---

## Quick Deploy Instructions (5 minutes)

### Step 1: Clear Vercel Deployment Cache

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **garieva-prince-official**
3. Go to **Deployments** tab
4. Click the three dots (**...**) on your latest deployment
5. Click **"Clear cache"**

### Step 2: Add Environment Variables

In Vercel Dashboard → **Settings → Environment Variables**, add these:

```bash
# =============================================================================
# DATABASE SETUP (Choose ONE - NOT BOTH)
# =============================================================================
# Option A: Cloudflare D1 (Recommended if using Cloudflare Workers)
DATABASE_URL=cloudflare:D1:YOUR_DATABASE_ID  # Get from Cloudflare Dashboard

# OR Option B: PostgreSQL (for Vercel native database)
# DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require


# =============================================================================
# AUTHENTICATION SESSION SECRETS (REQUIRED!)
# Generate with: npm run generate-secrets
# OR use openssl: openssl rand -hex 32 (for session secret)
# OR: openssl rand -hex 16 (for OTP pepper)
# =============================================================================
AUTH_SESSION_SECRET=change-this-to-random-32-chars-minimum
AUTH_OTP_PEPPER=change-this-to-random-16-charts-minimum

# =============================================================================
# BREVO EMAIL SERVICE (REQUIRED for OTP authentication!)
# Get API key: https://app.brevo.com/settings/api-keys
# Verify sender email: https://app.brevo.com/settings/sender-emails
# =============================================================================
BREVO_API_KEY=your-brevo-api-key-here
BREVO_SENDER_EMAIL=noreply@garieva-prince.com  # Must be verified in Brevo!
BREVO_SENDER_NAME=Garieva Prince

# =============================================================================
# ADMIN USER ID (Optional - auto-generated for development)
# Set to super_admin user ID from database when ready
# =============================================================================
ADMIN_USER_ID=  # Leave empty for now, or set to admin user ID
```

**Important**: Replace `YOUR_DATABASE_ID` with actual Cloudflare D1 database ID OR PostgreSQL connection string.

### Step 3: Deploy

Click **"New Deployment"** button in Vercel Dashboard

- Select deployment method: **Import Git Repository**
- Choose your GitHub repo: https://github.com/IsaacTalb/garieva-prince-official
- Click **"Import"**
- Add environment variables (from above)
- Click **"Deploy"**

### Step 4: Verify Deployment

After deployment completes (2-5 minutes):

1. Visit your Vercel project URL: `https://garieva-prince-official.vercel.app`
2. Test **/api/health** endpoint
3. Test product catalog at **/products**
4. Test authentication flow at **/account/sign-in**

---

## Environment Variables Reference

### Required Variables (Must Set):

| Variable | Required? | Example Value | Where to Get |
|----------|-----------|---------------|--------------|
| `DATABASE_URL` | ✅ Yes | See below | Cloudflare D1 or PostgreSQL |
| `AUTH_SESSION_SECRET` | ✅ Yes | 32-char random string | Generate with openssl |
| `AUTH_OTP_PEPPER` | ✅ Yes | 16-char random string | Generate with openssl |
| `BREVO_API_KEY` | ✅ Yes | From Brevo Dashboard | https://app.brevo.com/settings/api-keys |
| `BREVO_SENDER_EMAIL` | ✅ Yes | Verified email address | Must be verified in Brevo! |

### Optional Variables:

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `ADMIN_USER_ID` | ⚠️ No (for admin features) | Set to super_admin user ID from database |
| `APP_BASE_URL` | Optional | Your production domain (auto-detected) |

---

## Database Configuration Options

### Option A: Cloudflare D1 (Recommended)

**Setup**:
1. Visit [Cloudflare Dashboard → Workers & AI → D1](https://dash.cloudflare.com/)
2. Create database: `garieva-prince-prod`
3. Note the **Database ID** (e.g., `xxxxxxxxxxxx`)

**Vercel Environment Variable**:
```bash
DATABASE_URL=cloudflare:D1:YOUR_DATABASE_ID
```

### Option B: PostgreSQL (Vercel Managed)

**Setup via Vercel Dashboard**:
1. Go to your Vercel project
2. Click **"Add service"** → **Database** → **PostgreSQL**
3. Create database and get connection string

**Vercel Environment Variable**:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

### Option C: PostgreSQL on Railway/Render

If deploying with external PostgreSQL service (Railway, Render), use their connection string:

```bash
DATABASE_URL=postgresql://user:password@railway-host:5432/garieva_prince
```

---

## Pre-Deployment Checklist ⚠️

Before deploying, ensure these are completed:

### ✅ Brevo Email Service (REQUIRED!)
- [ ] Visit https://app.brevo.com/settings/api-keys
- [ ] Generate API key and copy
- [ ] Add to Vercel environment variable as `BREVO_API_KEY`

### ✅ Verified Sender Email (REQUIRED!)
- [ ] Visit https://app.brevo.com/settings/sender-emails
- [ ] Add sender email (e.g., `noreply@garieva-prince.com`)
- [ ] Verify via email link sent to inbox
- [ ] Add verified email to Vercel as `BREVO_SENDER_EMAIL`

### ✅ Database Created and Migrations Applied
- [ ] Create D1 database in Cloudflare OR PostgreSQL on Vercel/Railway/Render
- [ ] Apply migrations from `cloudflare/migrations/` folder (see below)

### Generate Random Secrets (If not using auto-generated):
```bash
# Session secret (min 32 characters)
AUTH_SESSION_SECRET=$(openssl rand -hex 32)

# OTP pepper (min 16 characters)
AUTH_OTP_PEPPER=$(openssl rand -hex 16)
```

---

## Applying Database Migrations on Vercel

After deployment, you need to create the database schema. Choose one method:

### Method A: SQL Runner (Recommended for Cloudflare D1)

If using Cloudflare D1:
1. Visit [Cloudflare Dashboard → Workers & AI → D1](https://dash.cloudflare.com/)
2. Select your database
3. Click **"SQL"** tab
4. Copy and execute each migration file in order:
   - `cloudflare/migrations/0001_core.sql`
   - `cloudflare/migrations/0002_categories.sql`
   - `cloudflare/migrations/0003_cart_items.sql`
   - `cloudflare/migrations/0004_coupons.sql`
   - `cloudflare/migrations/0005_ownership_claim_codes.sql`
   - `cloudflare/migrations/0006_payment_approvals.sql`

### Method B: Vercel Function (Automatic Migration)

Create a migration function at `/api/migrate`:

```typescript
// src/app/api/migrate/route.ts
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/d1/client";

export async function POST() {
  const db = getDatabase();
  
  // Apply migrations programmatically (simplified example)
  // In production, use proper migration framework
  
  return NextResponse.json({ status: "ok" });
}
```

Then trigger via API call after deployment.

---

## Post-Deployment Verification

After deployment completes, test these endpoints:

```bash
# Health check (should work immediately)
curl https://your-domain.vercel.app/api/health

# Product catalog (should show products or redirect to storefront)
curl https://your-domain.vercel.app/products

# Admin health (if admin routes are configured)
curl -X GET https://your-domain.vercel.app/admin/health
```

Expected responses:
- `/api/health` → `{"status":"ok","databaseConfigured":true}`
- `/products` → Array of products or storefront redirect

---

## Troubleshooting Common Issues

### Issue: "DATABASE_URL must be set"

**Cause**: Database URL not configured in Vercel environment variables  
**Solution**: Add correct `DATABASE_URL` to Vercel settings (see options above)

### Issue: "BREVO_API_KEY not found"

**Cause**: Brevo email service not configured  
**Solution**: 
1. Get API key from https://app.brevo.com/settings/api-keys
2. Add to Vercel environment variables
3. Verify sender email at https://app.brevo.com/settings/sender-emails

### Issue: "Module not found" errors

**Cause**: Dependencies not installed  
**Solution**: 
1. Ensure `.env.production` exists locally with correct values
2. Run `npm ci` or `npm install --legacy-peer-deps` before deploying
3. Or use Vercel's built-in npm cache (recommended)

### Issue: Still seeing Clerk/Supabase errors

**Cause**: Old deployment cache not cleared  
**Solution**: 
1. Go to Vercel Dashboard → Deployments
2. Click three dots (...) on latest deployment
3. Select "Clear cache"
4. Redeploy or create new deployment from same commit

---

## Security Best Practices for Production

- [x] ✅ Never commit `.env.production` to Git (add to .gitignore)
- [ ] Use Vercel environment variables instead of file-based secrets
- [ ] Generate strong random values for `AUTH_SESSION_SECRET` (32+ chars)
- [ ] Generate strong random value for `AUTH_OTP_PEPPER` (16+ chars)
- [ ] Enable HTTPS on all routes (automatic on Vercel)
- [ ] Set up database backups (Vercel PostgreSQL includes automatic backups)
- [ ] Configure rate limiting in Vercel settings

---

## Alternative: Deploy Using Command Line

If you prefer CLI deployment:

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Set environment variables locally (optional, Vercel can read from dashboard)
echo "DATABASE_URL=cloudflare:D1:your-db-id" >> .env.production
echo "AUTH_SESSION_SECRET=your-secret" >> .env.production
echo "AUTH_OTP_PEPPER=your-pepper" >> .env.production
echo "BREVO_API_KEY=your-api-key" >> .env.production
echo "BREVO_SENDER_EMAIL=noreply@garieva-prince.com" >> .env.production

# 4. Deploy
vercel --prod
```

---

## Support Resources

| Resource | Link | Purpose |
|----------|------|---------|
| **Vercel Docs** | https://vercel.com/docs | Vercel platform documentation |
| **Cloudflare Workers Docs** | https://developers.cloudflare.com/workers/ | Cloudflare deployment docs |
| **Brevo API Docs** | https://help.brevo.com/ | Email service documentation |
| **Vercel Environment Variables** | https://vercel.com/docs/concepts/deployments/environment-variables | Setting up env vars |

---

## Next Steps After Deployment

1. ✅ Verify all endpoints work (health, products, authentication)
2. ✅ Test email delivery via Brevo
3. ✅ Create admin user in database for admin panel access
4. ✅ Configure custom domain if desired (Settings → Domains on Vercel)
5. ✅ Set up monitoring (Vercel Analytics included)

---

## Rollback Plan

If deployment fails or issues occur:

1. Visit Vercel Dashboard → Project → Deployments
2. Select previous successful deployment from history
3. Click **"Promote to production"**

Or deploy from Git using same commit hash that worked.

---

**Last Updated**: 2026-11-19  
**Repository**: https://github.com/IsaacTalb/garieva-prince-official  
**Deployer**: Isaac Talb (<thaungahlaybaw@gmail.com>)  

---

Ready to deploy! Follow the steps above and you should be up and running within 5 minutes. 🚀