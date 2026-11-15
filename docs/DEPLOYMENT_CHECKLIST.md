# 📋 PRODUCTION DEPLOYMENT CHECKLIST

## Garieva Prince — Pre-Deployment Checklist

**Use this checklist before deploying to ANY platform (Cloudflare, Vercel, Railway, Render)**

---

## ✅ Phase 1: Local Development Setup (Complete)

- [x] Install dependencies locally
  ```bash
  npm install --legacy-peer-deps
  ```

- [x] Generate development secrets
  ```bash
  npm run generate-secrets
  ```

- [x] Verify `.env.local` exists with:
  - [ ] `DATABASE_URL=sqlite:./dev.db`
  - [ ] `AUTH_SESSION_SECRET=<random>`
  - [ ] `AUTH_OTP_PEPPER=<random>`
  - [ ] `BREVO_API_KEY=` (empty for now, configure before prod)

- [x] Test local development works
  ```bash
  npm run dev
  # Visit http://localhost:3000
  ```

---

## ✅ Phase 2: Production Secrets Generation

- [ ] **Generate production session secret** (min 32 characters):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Generate production OTP pepper** (min 16 characters):
  ```bash
  node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
  ```

- [ ] **Copy to clipboard**: Save these secrets securely (password manager or secure notes)

---

## ✅ Phase 3: Brevo Email Service Setup (REQUIRED)

- [ ] Visit https://app.brevo.com/settings/api-keys
  - [ ] Generate new API key
  - [ ] Copy API key

- [ ] Visit https://app.brevo.com/settings/sender-emails
  - [ ] Add sender email (e.g., `noreply@garieva-prince.com`)
  - [ ] Verify email via link sent to inbox
  - [ ] Copy verified email address

- [ ] Update `.env.production` or platform environment variables:
  - [ ] `BREVO_API_KEY=<your-api-key>`
  - [ ] `BREVO_SENDER_EMAIL=<verified-email>`
  - [ ] `BREVO_SENDER_NAME=Garieva Prince`

---

## ✅ Phase 4: Database Setup & Migrations

### Choose Your Database Type:

#### Option A: Cloudflare D1 (Recommended for Cloudflare Workers)

- [ ] Visit https://dash.cloudflare.com/ → Workers & AI → D1
- [ ] Click "Create database"
- [ ] Configure:
  - [ ] Name: `garieva-prince-prod`
  - [ ] Region: Choose closest to your users
  - [ ] Click "Create"

- [ ] **Note the Database ID** (e.g., `xxxxxxxxxxxx`)

- [ ] Create R2 buckets:
  - [ ] Public bucket: `garieva-prince-media-public`
  - [ ] Private bucket: `garieva-prince-media-private`

#### Option B: PostgreSQL (for Railway/Render/Vercel)

- [ ] Create new PostgreSQL database on platform
- [ ] Get connection string from platform dashboard

### Apply Migrations to Database:

- [ ] **For Cloudflare D1**:
  - Visit SQL Runner in Cloudflare Dashboard
  - Execute migrations in order:
    - [ ] `0001_core.sql`
    - [ ] `0002_categories.sql`
    - [ ] `0003_cart_items.sql`
    - [ ] `0004_coupons.sql`
    - [ ] `0005_ownership_claim_codes.sql`
    - [ ] `0006_payment_approvals.sql`

- [ ] **For PostgreSQL**:
  ```bash
  # Combine all migrations
  cat cloudflare/migrations/0001_core.sql \
      cloudflare/migrations/0002_categories.sql \
      ... > all_migrations.sql
  
  # Execute via psql or SQL Runner
  psql -U postgres -d garieva_prince -f all_migrations.sql
  ```

---

## ✅ Phase 5: Environment Variables Configuration

### Create Platform Environment Variables

**For EACH deployment platform**, add these environment variables:

- [ ] `DATABASE_URL`
  - Cloudflare: `cloudflare:D1:YOUR_DATABASE_ID`
  - PostgreSQL: `postgresql://user:password@host:5432/dbname`

- [ ] `AUTH_SESSION_SECRET` (paste generated secret)
- [ ] `AUTH_OTP_PEPPER` (paste generated pepper)

- [ ] `BREVO_API_KEY` (from Brevo Dashboard)
- [ ] `BREVO_SENDER_EMAIL` (verified email from Brevo)
- [ ] `BREVO_SENDER_NAME=Garieva Prince`

**Optional (can be empty for development)**:
- [ ] `ADMIN_USER_ID` (super_admin user ID from database)
- [ ] `R2_*` variables (only needed for Cloudflare deployment)

---

## ✅ Phase 6: Code Quality Checks

- [ ] Run typecheck locally:
  ```bash
  npm run typecheck
  ```

- [ ] Run lint locally:
  ```bash
  npm run lint
  ```

- [ ] Verify build succeeds:
  ```bash
  npm run build
  ```

- [ ] Test all routes work locally:
  - [ ] `GET /api/health`
  - [ ] `GET /products`
  - [ ] `POST /api/payments/approve` (admin endpoint)

---

## ✅ Phase 7: Git Preparation

- [ ] Update `.gitignore` to exclude production secrets
- [ ] Add documentation files to commit:
  ```bash
  git add .env.production.example
  git add docs/PRODUCTION_DEPLOYMENT.md
  git add docs/DEPLOYMENT_CHECKLIST.md
  ```

- [ ] Commit changes:
  ```bash
  git commit -m "docs: add production deployment documentation"
  git push origin main
  ```

---

## ✅ Phase 8: Platform-Specific Deployment Setup

### Cloudflare Workers Deployment:

- [ ] Install Wrangler globally:
  ```bash
  npm install -g wrangler
  ```

- [ ] Get credentials from Cloudflare Dashboard:
  - [ ] Account ID
  - [ ] R2 Access Key & Secret
  - [ ] D1 Database ID

- [ ] Create `.env.production` file with real values (NEVER commit!)

- [ ] Deploy command:
  ```bash
  npx wrangler deploy garieva-prince --env production
  ```

- [ ] Set secrets via Wrangler:
  ```bash
  npx wrangler secrets put AUTH_SESSION_SECRET "your-secret" --env production
  # ... etc for other secrets
  ```

### Vercel Deployment:

- [ ] Import repository to Vercel Dashboard
- [ ] Add environment variables in Settings → Environment Variables
- [ ] Configure build settings:
  - Build Command: `npm install && npm run build`
  - Output Directory: `.next`
- [ ] Deploy with:
  ```bash
  vercel --prod
  ```

### Railway Deployment:

- [ ] Create new project in Railway dashboard
- [ ] Deploy from GitHub repository
- [ ] Add PostgreSQL database (or use existing)
- [ ] Add environment variables in Settings → Environment
- [ ] Automatic deployment on git push

### Render Deployment:

- [ ] Create new web service in Render Dashboard
- [ ] Connect GitHub repository
- [ ] Configure build/start commands
- [ ] Add PostgreSQL database
- [ ] Add environment variables
- [ ] Automatic deployment on git push

---

## ✅ Phase 9: Custom Domain Setup (Optional)

### Cloudflare Workers:

- [ ] Visit Workers & AI → Workers → Your Worker → Domains
- [ ] Add custom domain (e.g., `www.yourdomain.com`)
- [ ] Update DNS records in domain registrar

### Vercel:

- [ ] Settings → Domains → Add your domain
- [ ] Verify DNS records automatically configured

### Railway/Render:

- [ ] Settings → Custom Domain → Add domain
- [ ] Configure DNS as instructed by platform

---

## ✅ Phase 10: Security Hardening

- [ ] Enable HTTPS on all routes (automatic on most platforms)
- [ ] Set up rate limiting in platform settings
- [ ] Review and restrict API route access
- [ ] Ensure no sensitive data exposed in client-side code
- [ ] Verify database SSL connections enabled
- [ ] Configure Web Application Firewall (WAF) if available

---

## ✅ Phase 11: Monitoring & Alerts Setup

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Enable platform logs and alerts
- [ ] Set up database backup schedule

---

## ✅ Phase 12: Post-Deployment Verification

After deployment, verify these endpoints work:

- [ ] Health check: `GET https://yourdomain.com/api/health`
  - Expected: `{"status":"ok"}`

- [ ] Product catalog: `GET https://yourdomain.com/products`
  - Expected: Array of products or storefront redirect

- [ ] Admin health: `GET https://yourdomain.com/admin/health`
  - Expected: Admin endpoints accessible (with proper auth)

- [ ] Authentication flow: Visit `/account/sign-in` and test OTP login

- [ ] Email delivery: Test that Brevo emails are sent successfully

---

## ✅ Phase 13: Production Monitoring (First 24 Hours)

- [ ] Monitor platform logs for errors
- [ ] Check Brevo Dashboard for email delivery issues
- [ ] Review error tracking service (Sentry, etc.)
- [ ] Verify database connections stable
- [ ] Test all major user flows (login, browse products, checkout)

---

## ✅ Phase 14: Final Security Audit

- [ ] Review all environment variables in platform dashboard
- [ ] Ensure no secrets committed to Git repository
- [ ] Verify `.gitignore` excludes sensitive files
- [ ] Check database has proper access controls
- [ ] Review API routes for unnecessary exposure
- [ ] Verify HTTPS enforced on all routes

---

## 🎉 Deployment Complete!

After completing all checklist items:

### Next Steps:

1. ✅ Monitor platform logs and error tracking
2. ✅ Test authentication flow with real users
3. ✅ Verify email delivery works correctly
4. ✅ Check product catalog loads properly
5. ✅ Review analytics if configured

### Rollback Plan (If Issues Arise):

**Cloudflare Workers:**
```bash
npx wrangler deploy --prev-branch=latest
```

**Vercel:**
1. Deployments tab → Previous deployment → Promote to production

**Railway/Render:**
- Deployment history → Previous deployment → Promote

---

## 📞 Support Resources

- **Documentation**: 
  - `docs/PRODUCTION_DEPLOYMENT.md` - Full deployment guide
  - `docs/CLOUDFLARE.md` - Cloudflare-specific instructions
  
- **Platform Docs**:
  - Cloudflare Workers: https://developers.cloudflare.com/workers/
  - Vercel: https://vercel.com/docs
  - Railway: https://docs.railway.app/
  - Render: https://render.com/docs

- **Brevo Support**: https://help.brevo.com/

---

**Last Updated**: 2026-11-15  
**Project**: Garieva Prince Official  
**GitHub**: https://github.com/IsaacTalb/garieva-prince-official