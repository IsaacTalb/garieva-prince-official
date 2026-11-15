# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Garieva Prince — Production Setup for Vercel, Cloudflare, Railway, Render

**Status**: ✅ Production Ready  
**Last Updated**: 2026-11-15

---

## Quick Start: Choose Your Platform

| Platform | Best For | Setup Time |
|----------|----------|------------|
| **Cloudflare Workers** | Edge functions, D1, R2 native | ⭐⭐⭐ Easyest (if already using CF) |
| **Vercel** | Next.js apps, automatic deployments | ⭐⭐ Easy |
| **Railway** | Full-stack apps, database included | ⭐⭐ Easy |
| **Render** | VPS-like experience, free tier | ⭐ Medium |

---

## 📋 Pre-Deployment Checklist

Before deploying to ANY platform, ensure:

```bash
# 1. Install dependencies locally (once)
npm install --legacy-peer-deps

# 2. Generate production secrets
npm run generate-secrets

# 3. Update .env.production with REAL values (see below)
```

---

## Platform 1: Cloudflare Workers (Recommended for D1/R2)

### Setup Steps

#### Step 1: Create Cloudflare Resources

1. **Create D1 Database**:
   - Visit [Cloudflare Dashboard → Workers & AI → D1](https://dash.cloudflare.com/)
   - Click "Create database"
   - Name: `garieva-prince-prod`
   - Region: Choose closest to your users

2. **Create R2 Buckets**:
   - Visit [Cloudflare Dashboard → Workers & AI → R2](https://dash.cloudflare.com/)
   - Create two buckets:
     - `garieva-prince-media-public` (product images)
     - `garieva-prince-media-private` (payment proofs, uploads)

3. **Get Credentials**:
   - Account ID from Workers & AI → Overview
   - R2 Access Key & Secret from R2 → Settings → API Keys

#### Step 2: Environment Variables

Create `.env.production` for Cloudflare:

```bash
# =============================================================================
# GARIEVA PRINCE — PRODUCTION ENVIRONMENT (Cloudflare)
# =============================================================================

# App Configuration
APP_BASE_URL=https://your-domain.com

# Database - Cloudflare D1 Binding
DATABASE_URL=cloudflare:D1:YOUR_DATABASE_ID
CLOUDFLARE_D1_DATABASE_NAME=garieva-prince-prod

# Session Secrets - Use strong random values! (min 32 chars)
AUTH_SESSION_SECRET=production-session-secret-min-32-chars-change-this
AUTH_OTP_PEPPER=production-pepper-min-16-chars-change-this

# Brevo Email Service (REQUIRED for OTP)
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

#### Step 3: Deploy to Cloudflare

```bash
# Install wrangler (if not installed)
npm install -g wrangler

# Build application
npm run build

# Deploy
npx wrangler deploy garieva-prince --env production

# Set environment variables (recommended for secrets)
npx wrangler secrets put AUTH_SESSION_SECRET "your-secret" --env production
npx wrangler secrets put DATABASE_URL "cloudflare:D1:your-db-id" --env production
# ... etc for all other secrets
```

#### Step 4: Custom Domain Setup

1. Visit [Cloudflare Dashboard → Workers & AI → Workers](https://dash.cloudflare.com/)
2. Select your worker
3. Click "Domains" tab
4. Add custom domain (e.g., `www.yourdomain.com`)
5. Update DNS records in your domain registrar

---

## Platform 2: Vercel (Easiest for Next.js)

### Setup Steps

#### Step 1: Prepare Project

```bash
# Install dependencies
npm install --legacy-peer-deps

# Remove postinstall script that runs build automatically
# It will run on Vercel anyway
# Or keep it if you want local builds too
```

#### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

#### Step 3: Environment Variables in Vercel Dashboard

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository: https://github.com/IsaacTalb/garieva-prince-official
3. Go to **Settings → Environment Variables**
4. Add ALL variables from `.env.production.example` (see below)

### Vercel Environment Variables Template

Create `.env.production.example`:

```bash
# =============================================================================
# GARIEVA PRINCE — PRODUCTION ENVIRONMENT (Vercel/Railway/Render)
# =============================================================================
# NEVER commit this file to Git! Use .env.production.local or Vercel dashboard

# App Configuration
APP_BASE_URL=https://your-domain.vercel.app  # Or your custom domain

# Database - Vercel supports multiple database providers
DATABASE_URL=postgresql://user:password@host:5432/dbname  # PostgreSQL example
# OR use Cloudflare D1 if deployed there
# DATABASE_URL=cloudflare:D1:your-database-id

# Session Secrets - Generate with openssl or npm run generate-secrets
AUTH_SESSION_SECRET=change-this-to-random-32-chars-minimum
AUTH_OTP_PEPPER=change-this-to-random-16-chars-minimum

# Brevo Email Service (REQUIRED for OTP)
BREVO_API_KEY=your-production-brevo-api-key
BREVO_SENDER_EMAIL=noreply@garieva-prince.com  # Must be verified in Brevo
BREVO_SENDER_NAME=Garieva Prince

# R2 Media Storage (Optional - can use external S3 or Vercel Blob)
R2_ACCOUNT_ID=your-account-id  # Cloudflare R2 or AWS S3
R2_ACCESS_KEY_ID=your-access-key  # Or Vercel Blob token
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_BUCKET_NAME=garieva-prince-media-public
R2_PRIVATE_BUCKET_NAME=garieva-prince-media-private
R2_PUBLIC_BASE_URL=https://your-cdn-url.com

# Admin User ID
ADMIN_USER_ID=your-super-admin-user-id-from-d1-or-postgres
```

**Important**: Add these to Vercel Dashboard Settings → Environment Variables:
- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `AUTH_OTP_PEPPER`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `ADMIN_USER_ID` (optional for dev)

#### Step 4: Configure Build Settings

In Vercel Dashboard → **Settings → Build & Deployment**:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps"
}
```

---

## Platform 3: Railway (Full-Stack with Database)

### Setup Steps

#### Step 1: Deploy to Railway

1. Visit [Railway App](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

#### Step 2: Add Service - PostgreSQL (or Cloudflare D1)

In Railway dashboard:
- Click **+ New** → **Database** → **PostgreSQL** (recommended) or **D1**
- Create database and get connection string

#### Step 3: Environment Variables

In Railway Settings → **Environment Variables**:

```bash
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/garieva_prince
AUTH_SESSION_SECRET=generate-with-railway-secrets
AUTH_OTP_PEPPER=generate-with-railway-secrets
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@garieva-prince.com
ADMIN_USER_ID=  # Auto-generated for now
```

Railway can auto-generate secrets via **Settings → Secrets**.

#### Step 4: Deploy

Railway will automatically build and deploy. First deploy may take 5-10 minutes.

---

## Platform 4: Render (Free VPS Alternative)

### Setup Steps

#### Step 1: Create Web Service

1. Visit [Render Dashboard](https://dashboard.render.io/)
2. Click **New** → **Web Service**
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### Step 2: Environment Variables

In Render Settings → **Environment**:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-db-url/dbname
AUTH_SESSION_SECRET=your-production-secret
AUTH_OTP_PEPPER=your-production-pepper
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@garieva-prince.com
ADMIN_USER_ID=  # Optional
```

#### Step 3: Add PostgreSQL Database

In Render Dashboard:
- Click **New** → **PostgreSQL**
- Create database and get connection URL
- Add `DATABASE_URL` to environment variables

---

## 🔐 Security Best Practices for Production

### 1. Never Commit Secrets to Git

```bash
# Add to .gitignore
echo ".env.production" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. Generate Strong Secrets

**Generate session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate OTP pepper:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3. Use Platform Secrets

- **Vercel**: Settings → Environment Variables
- **Cloudflare**: `wrangler secrets put`
- **Railway**: Settings → Secrets
- **Render**: Settings → Environment → Add as secret

### 4. Enable HTTPS Everywhere

All platforms automatically provide HTTPS. Never expose API routes without authentication.

### 5. Rate Limiting

Configure in each platform:

**Vercel**: Settings → Security → Rate Limiting Rules  
**Cloudflare**: Workers dashboard → Configuration → Rate Limits  
**Railway/Render**: Use `express-rate-limit` middleware if needed

### 6. Database Backups

- **Cloudflare D1**: Automatic backups enabled
- **PostgreSQL**: Set up external backup solution (e.g.,pgBackRest)
- **Vercel**: Use Vercel database or external backup

### 7. Monitoring & Alerts

Recommended tools:
- **Sentry** (error tracking): https://sentry.io/
- **LogRocket** (session replay): https://logrocket.com/
- **UptimeRobot** (monitoring): https://uptimerobot.com/

---

## 📦 Database Migration to Production

### For Cloudflare D1:

```bash
# 1. Apply migrations via Cloudflare SQL Runner
# Visit: https://dash.cloudflare.com/ → Workers & AI → D1 → SQL

# 2. Run each migration file in order:
cat cloudflare/migrations/0001_core.sql | paste -d '\n' - - <(echo "SELECT 'Applied';")
```

### For PostgreSQL (Railway/Render):

Create `cloudflare/migrations/apply-postgres.sql`:

```bash
-- Combine all migrations for PostgreSQL
cat cloudflare/migrations/0001_core.sql \
    cloudflare/migrations/0002_categories.sql \
    cloudflare/migrations/0003_cart_items.sql \
    cloudflare/migrations/0004_coupons.sql \
    cloudflare/migrations/0005_ownership_claim_codes.sql \
    cloudflare/migrations/0006_payment_approvals.sql \
    > cloudflare/migrations/all_migrations.sql

# Execute in your database:
psql -U postgres -d garieva_prince -f cloudflare/migrations/all_migrations.sql
```

---

## 🧪 Pre-Deployment Testing Checklist

Before deploying, run these locally:

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Generate secrets
npm run generate-secrets

# 3. Test development build
npm run build

# 4. Run typecheck
npm run typecheck

# 5. Run lint
npm run lint

# 6. Verify all routes work:
curl http://localhost:3000/api/health
curl http://localhost:3000/products
```

---

## 🚀 Production Deployment Commands by Platform

### Cloudflare Workers:

```bash
npx wrangler deploy garieva-prince --env production
```

### Vercel:

```bash
vercel --prod
```

### Railway/Render (automatic):

Just commit your code to GitHub after updating `.env.production.example` with real values.

---

## 📊 Post-Deployment Verification

After deployment, verify these endpoints:

```bash
# Health check (all platforms)
curl https://your-domain.com/api/health

# Product catalog
curl https://your-domain.com/products

# Admin health (if applicable)
curl -X GET https://your-domain.com/admin/health
```

Expected responses:
- `/api/health` → `{"status":"ok"}`
- `/products` → Array of products or storefront redirect

---

## 🔄 Rollback Strategy

If deployment fails or issues occur:

### Cloudflare Workers:
```bash
# Redeploy previous version
npx wrangler deploy --prev-branch=latest
```

### Vercel:
1. Visit project in Vercel Dashboard
2. Click **Deployments** tab
3. Select previous deployment → **Promote to production**

### Railway/Render:
- Platforms keep deployment history automatically
- Click previous deployment → **Promote to production**

---

## 📝 Environment Variables Reference

| Variable | Required? | Production Value Example |
|----------|-----------|-------------------------|
| `APP_BASE_URL` | ✅ Yes | `https://yourdomain.com` |
| `DATABASE_URL` | ✅ Yes | Cloudflare D1 or PostgreSQL connection string |
| `AUTH_SESSION_SECRET` | ✅ Yes | 32+ char random hex string |
| `AUTH_OTP_PEPPER` | ✅ Yes | 16+ char random hex string |
| `BREVO_API_KEY` | ✅ Yes | From Brevo Dashboard |
| `BREVO_SENDER_EMAIL` | ✅ Yes | Verified email in Brevo |
| `ADMIN_USER_ID` | ⚠️ Optional | super_admin user ID from DB |
| `R2_*` variables | ⚠️ Optional | Cloudflare R2 credentials |

---

## 🎯 Summary: Quick Deploy Guide

### Fastest Deployment (Cloudflare):
1. Create D1 database + R2 buckets in Cloudflare Dashboard
2. Get database ID and R2 credentials
3. Update `.env.production` with values
4. Run `npx wrangler deploy --env production`

### Easiest for Next.js (Vercel):
1. Import repo to Vercel Dashboard
2. Add environment variables in Settings
3. Automatic deployment on git push

### Full-Stack with Database (Railway):
1. Deploy service to Railway
2. Add PostgreSQL database
3. Railway auto-detects and deploys

---

## 🆘 Getting Help

If you encounter issues:

1. Check platform-specific documentation links above
2. Review error logs in platform dashboard
3. Verify all environment variables are set correctly
4. Ensure database migrations ran successfully
5. Test local deployment first before production

---

**Last Updated**: 2026-11-15  
**Project**: Garieva Prince Official  
**GitHub**: https://github.com/IsaacTalb/garieva-prince-official