# PHASE 7 SETUP — LOCAL DEVELOPMENT GUIDE

## ✅ Build Error Resolved!

The "Module not found: Can't resolve 'postgres'" error has been fixed. The application now uses **better-sqlite3** for local development instead of the postgres package.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Generate Random Secrets

```bash
npm run generate-secrets
```

This will create `.env.local` with random values for `AUTH_SESSION_SECRET` and `AUTH_OTP_PEPPER`.

**OR** if `.env.local` already exists from this commit, you can skip this step.

### Step 2: Get Brevo API Key

1. Go to https://app.brevo.com/
2. Sign up for a FREE account (or use existing one)
3. Go to **Settings > API Keys**
4. Generate an API key and copy it
5. Edit `.env.local`:
   ```bash
   BREVO_API_KEY=your-api-key-from-brevo-here
   ```

### Step 3: Configure Sender Email

In Brevo Dashboard, verify your email address to use as sender:
1. Go to **Settings > Sender Emails**
2. Add a verified email (e.g., `noreply@garieva-prince.com`)
3. Copy the verified email and update `.env.local`:
   ```bash
   BREVO_SENDER_EMAIL=your-verified-email@example.com
   ```

### Step 4: Start Development Server

```bash
npm run dev
```

The app will start at http://localhost:3000

---

## 📋 Environment Variables Explained

### Required for Local Development (MINIMAL)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:./dev.db` (auto) | SQLite file-based database (no Cloudflare needed!) |
| `AUTH_SESSION_SECRET` | Generated random value | Encrypts session tokens (MUST SET!) |
| `AUTH_OTP_PEPPER` | Generated random value | Adds extra security to OTP generation |
| `BREVO_API_KEY` | *(required)* | Sends 6-digit OTP codes via email |
| `BREVO_SENDER_EMAIL` | *(required)* | Email address that sends OTPs (must be verified in Brevo) |

### Optional for Local Development

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLOUDFLARE_D1_DATABASE_NAME` | `garieva-prince` | D1 database name (used on production deploy) |
| `ADMIN_USER_ID` | *(auto-generated)* | User ID of super_admin in D1 |
| R2_* variables | Empty | Media storage (optional for now) |

---

## 🔧 Where to Get Credentials

### 1. Brevo Email Service (REQUIRED)

**Free tier includes**: 300 emails/day - perfect for development!

- **Sign up**: https://app.brevo.com/
- **Get API Key**: Settings > API Keys > Generate API Key
- **Verify email**: Settings > Sender Emails > Add & Verify
- **Test it works**: Send yourself a test OTP code

### 2. Cloudflare D1 (OPTIONAL for now)

You can start development WITHOUT Cloudflare:
- SQLite handles all database operations locally
- When ready for production, bind to actual D1 database
- Migration scripts in `cloudflare/migrations/` work with both SQLite and D1

---

## 🧪 Testing Without Cloudflare

The application will work for most features without Cloudflare:

### ✅ What Works Locally (No Cloudflare needed)
- Browse products/catalog (`/`)
- View product details (`/product/[id]`)
- Add items to cart
- Test checkout flow
- Upload payment proofs (stored locally in SQLite)
- Admin dashboard (`/admin/*`) with generated admin user

### ⚠️ What Needs Cloudflare Later
- Actual D1 database binding (production data persistence)
- R2 media storage for production images
- Cloudflare Workers deployment
- Domain routing and SSL

---

## 🐛 Common Issues & Solutions

### Issue: "AUTH_SESSION_SECRET not configured"
**Solution**: Run `npm run generate-secrets` or manually set a random 32+ character string

```bash
# Generate random secret
echo "AUTH_SESSION_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### Issue: OTP emails not sending
**Solution**: Verify sender email in Brevo Dashboard and get API key

1. Go to https://app.brevo.com/settings/sender-emails
2. Add and verify your email address
3. Copy the verified email to `BREVO_SENDER_EMAIL`
4. Get API key from Settings > API Keys

### Issue: "Module not found: better-sqlite3"
**Solution**: Install dependencies

```bash
npm ci
# OR
npm install
```

---

## 📝 Next Steps After Local Setup

### Phase 7 — Manual Payment + Email Claim Code

Once you have Brevo configured:

1. **Start with checkout flow**: Test payment proof upload
2. **Set up admin user**: Create super_admin in D1, set `ADMIN_USER_ID`
3. **Test claim codes**: Generate and test ownership claim codes
4. **Configure email templates**: Customize OTP and order confirmation emails

### Phase 8 — Account / Wardrobe / Profile

Build account pages showing:
- Owned products with NFC serials
- Order history
- Profile settings

### Production Deployment

When ready to deploy to Cloudflare Workers:
1. Create D1 database on Cloudflare Dashboard
2. Update `DATABASE_URL=cloudflare:D1:your-database-id`
3. Bind R2 buckets in Wrangler config
4. Deploy with `wrangler deploy`

---

## 🔐 Security Notes

### Local Development Secrets

The generated secrets in `.env.local` are:
- ✅ Random and secure (SHA-256 hashed)
- ✅ NOT committed to Git (`.env.local` is ignored)
- ⚠️ Change them when deploying to production

**To regenerate**: Delete `.env.local` and run `npm run generate-secrets`

### Brevo Test Mode

For testing, you can:
1. Use Brevo free tier (300 emails/day)
2. Set up test email address for OTP verification
3. Monitor sent emails in Brevo Dashboard

---

## 📚 Additional Documentation

- `docs/PHASE_7_SETUP.md` — **This guide** (you're here!)
- `docs/GRAAD_SUMMARY.md` — Complete phases 1-6 summary
- `docs/PHASE_6_COMPLETION.md` — Commerce features implemented
- `.env.example` — Environment template with full documentation
- `cloudflare/migrations/0001_core.sql` — D1 database schema

---

## 🎉 You're Ready!

Once you have:
✅ Generated secrets (`npm run generate-secrets`)  
✅ Configured Brevo API key  
✅ Verified sender email in Brevo  

**You can now run**:
```bash
npm run dev
```

And start testing the application locally without any Cloudflare setup!

---

**Need help?** Check:
- `.env.local` comments for variable explanations
- `docs/GRAAD_SUMMARY.md` for complete migration history  
- `GP_CONTEXT.md` for full project requirements

Happy developing! 🚀