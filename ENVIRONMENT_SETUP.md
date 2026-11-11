# 🚀 GARIEVA PRINCE — LOCAL DEVELOPMENT ENVIRONMENT SETUP

## ⚡ Quick Start Guide

### Step 1: Generate Environment Secrets (5 minutes)

```bash
npm run generate-secrets
```

This creates `.env.local` with cryptographically random session secrets.

**Or manually set**:
```bash
# On Windows (Git Bash or PowerShell):
$secret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
echo "AUTH_SESSION_SECRET=$secret" >> .env.local

$pepper = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
echo "AUTH_OTP_PEPPER=$pepper" >> .env.local
```

### Step 2: Get Brevo API Key (REQUIRED)

**Before you can test authentication**, you must configure Brevo:

1. Visit [https://app.brevo.com/](https://app.brevo.com/)
2. Sign up for a free account (or use existing one)
3. Go to **Settings > API Keys**
4. Click **"Generate New API Key"** → Copy it
5. Update `.env.local`:
   ```bash
   BREVO_API_KEY=paste-your-api-key-here
   ```

6. **Verify sender email**:
   - Go to **Settings > Sender Emails**
   - Add your email (e.g., `noreply@garieva-prince.com`)
   - Verify it via the link sent to your inbox
   - Update `.env.local`:
     ```bash
     BREVO_SENDER_EMAIL=your-verified-email@example.com
     ```

### Step 3: Start Development Server

```bash
npm run dev
```

Your app will be available at **http://localhost:3000**

---

## 📋 Complete Environment Configuration

### `.env.local` Template

```bash
# =============================================================================
# GARIEVA PRINCE — LOCAL DEVELOPMENT ENVIRONMENT
# =============================================================================
# Copy this file to .env.local and customize for your setup
# Never commit .env.local to Git!
# =============================================================================

# ---------------------------------------------------------------------------
# APP CONFIGURATION
# ---------------------------------------------------------------------------
APP_BASE_URL=http://localhost:3000

# ---------------------------------------------------------------------------
# DATABASE
# Local development uses SQLite (file-based, no Cloudflare needed)
# Production will use Cloudflare D1 when deployed
# ---------------------------------------------------------------------------
DATABASE_URL=sqlite:./dev.db  # Leave empty or use sqlite:./dev.db for local dev
CLOUDFLARE_D1_DATABASE_NAME=garieva-prince

# ---------------------------------------------------------------------------
# AUTHENTICATION SESSION SECRETS
# Used to encrypt session tokens and OTP codes
# Generate random values with: npm run generate-secrets
# OR use these placeholders for testing (replace in production!)
# ---------------------------------------------------------------------------
AUTH_SESSION_SECRET=c8a7b6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7
AUTH_OTP_PEPPER=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# ---------------------------------------------------------------------------
# BREVO EMAIL SERVICE (REQUIRED for OTP authentication)
# Get your API key: https://app.brevo.com/settings/api-keys
# Verify sender email: https://app.brevo.com/settings/sender-emails
# ---------------------------------------------------------------------------
BREVO_API_KEY=  # TODO: Add your Brevo API key from Brevo dashboard
BREVO_SENDER_EMAIL=your-verified-email@example.com  # TODO: Configure with verified email
BREVO_SENDER_NAME=Garieva Prince

# ---------------------------------------------------------------------------
# CLOUDFLARE R2 MEDIA STORAGE (Optional for local dev)
# Use this when deploying to Cloudflare Workers
# For local dev, product images will use placeholder URLs
# ---------------------------------------------------------------------------
R2_ACCOUNT_ID=  # Get from Cloudflare Dashboard > R2
R2_ACCESS_KEY_ID=  # Leave empty for local dev
R2_SECRET_ACCESS_KEY=  # Leave empty for local dev
R2_PUBLIC_BUCKET_NAME=garieva-prince-media-public
R2_PRIVATE_BUCKET_NAME=garieva-prince-media-private
R2_PUBLIC_BASE_URL=  # CDN URL when deployed (e.g., https://your-cdn.r2.cloudflarestorage.com)

# ---------------------------------------------------------------------------
# ADMIN USER ID
# For admin routes and D1 authorization
# Auto-generated for local dev, set to your super_admin ID in production
# ---------------------------------------------------------------------------
ADMIN_USER_ID=  # Set to user ID of super_admin in D1 (will be auto-generated if not set for local dev)

# ---------------------------------------------------------------------------
# OTHER OPTIONAL ENVIRONMENT VARIABLES
# ---------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📦 Required Environment Variables Explained

### DATABASE Configuration

| Variable | Local Dev Value | Production Value | Purpose |
|----------|-----------------|------------------|---------|
| `DATABASE_URL` | `sqlite:./dev.db` (or empty) | `cloudflare:D1:your-db-id` | Database connection string. SQLite for local dev, D1 for production |
| `CLOUDFLARE_D1_DATABASE_NAME` | N/A | `garieva-prince` | D1 database name when deployed to Cloudflare |

**Local Development**: SQLite file-based database (no PostgreSQL/Cloudflare needed)  
**Production**: Cloudflare D1 binding

### Authentication Configuration

| Variable | Required? | How to Get/Set |
|----------|-----------|----------------|
| `AUTH_SESSION_SECRET` | ✅ Yes | Generate random 32-char string (auto-generated by `npm run generate-secrets`) |
| `AUTH_OTP_PEPPER` | ✅ Yes | Generate random 16-char string (auto-generated by `npm run generate-secrets`) |

**Purpose**: These encrypt session tokens and OTP codes. Never use default values in production!

### Brevo Email Service (REQUIRED)

| Variable | Required? | How to Get |
|----------|-----------|------------|
| `BREVO_API_KEY` | ✅ **Yes** | [Brevo Dashboard > Settings > API Keys](https://app.brevo.com/settings/api-keys) |
| `BREVO_SENDER_EMAIL` | ✅ Yes | [Brevo Dashboard > Settings > Sender Emails](https://app.brevo.com/settings/sender-emails) |
| `BREVO_SENDER_NAME` | Optional | Display name for emails (default: "Garieva Prince") |

**Why Brevo is required**: The custom authentication flow sends 6-digit OTP codes via email. Without Brevo, users cannot verify their email addresses.

**Free Tier**: 300 emails/day — more than enough for development and early production use.

### R2 Media Storage (Optional for Local Dev)

| Variable | Required? | When to Set |
|----------|-----------|-------------|
| `R2_ACCOUNT_ID` | ❌ No | Only when deploying to Cloudflare Workers |
| `R2_ACCESS_KEY_ID` | ❌ No | Only when deploying to Cloudflare Workers |
| `R2_SECRET_ACCESS_KEY` | ❌ No | Only when deploying to Cloudflare Workers |

**Local Development**: Images will use placeholder URLs until you deploy to Cloudflare/R2.

### Admin Configuration

| Variable | Required? | When to Set |
|----------|-----------|-------------|
| `ADMIN_USER_ID` | ❌ No | When you have a super_admin user in D1 |

**Local Development**: Auto-generated admin user ID for testing admin routes.  
**Production**: Set to actual super_admin user ID from D1 database.

---

## 🔐 Security Best Practices

### ✅ Do:
- Generate random secrets using `npm run generate-secrets`
- Use strong, unique session secrets (32+ characters)
- Keep `.env.local` out of Git (it's in `.gitignore`)
- Use Brevo free tier for development (300 emails/day)
- Set `NODE_ENV=production` when deploying

### ❌ Don't:
- Commit `.env.local` to Git repository
- Use placeholder secrets in production without replacing them
- Share Brevo API keys with anyone
- Expose R2 credentials in client-side code

---

## 🛠️ Environment Command Reference

### Generate Random Secrets

```bash
npm run generate-secrets
```

Output:
```
AUTH_SESSION_SECRET=your-random-32-char-secret-here
AUTH_OTP_PEPPER=your-random-16-char-pepper-here
```

Copy these values to your `.env.local`.

---

### Check Current Environment Variables

```bash
# Windows (Git Bash):
env | grep -E "^(DATABASE|AUTH|BREVO|R2|ADMIN)"

# Or on Unix/Mac:
printenv | grep -E "^(DATABASE|AUTH|BREVO|R2|ADMIN)"
```

---

### Validate Environment Configuration

Before starting the dev server, verify key variables are set:

```bash
# Check if Brevo API key is configured (required for auth)
if [ -z "$BREVO_API_KEY" ]; then
  echo "⚠️  Warning: BREVO_API_KEY is not set. OTP emails will not send."
  echo "👉 Get your API key from: https://app.brevo.com/settings/api-keys"
fi

# Check if session secrets are configured (required for auth)
if [ -z "$AUTH_SESSION_SECRET" ] || [ -z "$AUTH_OTP_PEPPER" ]; then
  echo "⚠️  Warning: Session secrets not set. Run 'npm run generate-secrets'"
fi

# Check database configuration
echo "Database URL: ${DATABASE_URL:-'Using default sqlite:./dev.db'}"
```

---

## 📝 Troubleshooting Environment Issues

### Issue: `DATABASE_URL must be set for development`

**Solution**: Either:
1. Set `DATABASE_URL=sqlite:./dev.db` in `.env.local`, OR
2. Leave it empty (will auto-default to SQLite)

### Issue: `Module not found: Can't resolve 'postgres'`

**Status**: ✅ **FIXED!** The project now uses `better-sqlite3` for local dev instead of `postgres`. You can ignore any old references to postgres in documentation.

### Issue: OTP emails not sending

**Cause**: `BREVO_API_KEY` is not set  
**Solution**: 
1. Visit [Brevo Dashboard](https://app.brevo.com/settings/api-keys)
2. Generate API key
3. Add to `.env.local`:
   ```bash
   BREVO_API_KEY=your-api-key-here
   ```

### Issue: Admin routes not working (403 Forbidden)

**Cause**: `ADMIN_USER_ID` not set or doesn't match super_admin  
**Solution for local dev**: Leave empty (auto-generated admin user will be created)  
**Solution for production**: Set to actual super_admin user ID from D1

---

## 🚀 Next Steps After Setup

### 1. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

### 2. Test Authentication Flow

1. Go to `/account/sign-in` (or login page)
2. Enter email address
3. Check email for OTP code (you need Brevo configured!)
4. Verify email and create account
5. Complete profile setup

### 3. Browse Product Catalog

- Home page shows featured products
- `/products` shows all products
- Click product to see details with variants

### 4. Test Cart Functionality

- Add items to cart from product pages
- View cart at `/cart`
- Proceed to checkout

### 5. Explore Admin Panel

- Go to `/admin` (may require admin user)
- Browse products, orders, etc.

---

## 📚 Additional Documentation

| Document | Purpose |
|----------|---------|
| [`docs/PHASE_7_SETUP.md`](PHASE_7_SETUP.md) | Complete Phase 7 setup guide |
| [`docs/CLOUDFLARE.md`](CLOUDFLARE.md) | Cloudflare deployment instructions |
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | System architecture overview |
| [`docs/GP_CONTEXT.md`](GP_CONTEXT.md) | Project goals and requirements |

---

## 🎯 Summary

### What You Need for Local Development:

1. ✅ Node.js 22+ installed
2. ✅ `npm run generate-secrets` executed (creates `.env.local`)
3. ⚠️ **Brevo API key configured** (required for OTP emails)
4. ✅ DATABASE_URL set to SQLite (auto-defaulted if empty)
5. ✅ R2 optional (product images will use placeholders)

### What You Get:

- Full Next.js application running locally
- Custom authentication with email verification
- Product catalog browsing
- Cart functionality
- Admin panel access
- All D1 repositories functional (via SQLite)

---

## ✅ Environment Setup Complete!

Once you have:
- [ ] Generated secrets (`npm run generate-secrets`)
- [ ] Configured Brevo API key (**REQUIRED** for auth)
- [ ] Verified sender email in Brevo
- [ ] Started dev server (`npm run dev`)

**Your local development environment is ready!** 🎉

---

## 📞 Getting Help

If you encounter issues:

1. Check this document for troubleshooting tips
2. Review `docs/PHASE_7_SETUP.md` for detailed setup instructions
3. Ensure all required dependencies are installed: `npm ci` or `npm install`
4. Verify `.env.local` is present and has correct values

---

**Last Updated**: 2026-11-10  
**Environment Type**: Local Development (SQLite)  
**Deployment Target**: Cloudflare Workers + D1 + R2