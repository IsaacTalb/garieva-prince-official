# PHASE 6 PLAN — COMMERCE FEATURE MIGRATION

## Status: Ready to Begin ✅

**Previous Work Completed**: Phases 1, 4, and 5 (including build error fixes)  
**Build Status**: ✅ Resolved all development errors  
**Repository**: Ready for commerce feature migration  

---

## 🎯 Phase 6 Goals

### Primary Objective
Migrate mature commerce features from Wild Soul Club reference repository into Garieva Prince architecture while maintaining GP branding, UI, and D1-only runtime.

### Key Requirements (from GP_CONTEXT.md)

- **Do not copy**: Wild Soul Club branding, content, products, assets, authentication, or database configuration
- **Adapt functionality**: Bring mature features into GP architecture using D1/R2
- **Maintain existing UI**: Do not alter working UI unnecessarily
- **Public catalog continues working**: Ensure public routes still fetch products correctly

---

## 📋 Feature Migration Checklist

### Products & Catalog

- [ ] **Product categories** — Hierarchical categorization (electronics, fashion, etc.)
- [ ] **Collections** — Curated product groupings with metadata
- [ ] **Drops/Launches** — Time-limited releases with launch dates
- [ ] **Archive sales** — Historical sale data and completed drops

### Inventory Management

- [ ] **Product variants** — Size, color options per product
- [ ] **Stock tracking** — Real-time inventory levels
- [ ] **SKU management** — Product identifiers and internal codes
- [ ] **Price management** — Regular prices, sale prices, discounts

### Commerce Workflows

- [ ] **Cart functionality** — Add/remove items, quantity updates
- [ ] **Checkout process** — Order creation, address collection
- [ ] **Order management** — Customer order history, admin order processing
- [ ] **Payment integration** — Manual payment verification workflow

### Marketing Features

- [ ] **Coupon system** — Discount codes, promotions, expiration dates
- [ ] **Restock notifications** — Email alerts when items back in stock
- [ ] **Product recommendations** — Related products, frequently bought together

### Admin Features

- [ ] **Product management UI** — CRUD for products, variants, collections
- [ ] **Inventory dashboard** — Stock levels, low-stock alerts
- [ ] **Sales reports** — Revenue tracking, sales by period
- [ ] **Coupon management** — Create/edit/deactivate coupons

---

## 🏗️ Architecture Migration Path

### Step 1: Analyze Wild Soul Club Reference

**Repository**: https://github.com/IsaacTalb/wildsoulclub

**Key Areas to Study**:
```
wildsoulclub/
├── src/db/schemas/          # PostgreSQL schemas → convert to D1
├── src/repositories/        # Repository patterns → adapt to D1 repos
├── src/app/products/        # Product pages → maintain GP UI
└── prisma/schema.prisma     # Schema → migrate to D1 SQL
```

**Questions to Answer**:
- How are products structured? (categories, variants)
- What's the inventory model? (stock tracking, low stock thresholds)
- How does cart/checkout work? (session vs server-side storage)
- What's the coupon system design? (discount types, rules)

### Step 2: Design D1 Schema Extensions

**Existing Tables** (from `cloudflare/migrations/0001_core.sql`):
```sql
users, products, product_variants, product_items,
product_media, collections, drops, nfc_tags, ownerships, ...
```

**Tables to Add**:
- `categories` — Product categories hierarchy
- `cart_items` — Cart session data
- `coupons` — Coupon definitions and rules
- `order_addresses` — Shipping/billing addresses

### Step 3: Implement Repository Functions

**Pattern**: Each repository follows D1 pattern with proper error handling

**Example** (categories.ts):
```typescript
export async function getCategoriesByParent(parentId?: string) {
  // D1 query with lateral joins for tree structure
}

export async function createCategory({ name, parentId }) {
  // Admin-only via requireAdmin()
}
```

### Step 4: Adapt Existing UI Components

**Maintain GP Branding**:
- Use existing Tailwind classes
- Preserve color scheme (monochrome + accent)
- Keep editorial typography
- Maintain whitespace and minimal design

**Component Structure**:
```typescript
// Keep existing layout, add new features
<ProductList>  // Existing GP component
  <CategoryFilter>  // New - from WSC but styled to GP</CategoryFilter>
  <ProductGrid>    // Existing GP component
    <ProductCard>   // Existing GP component
      {/* Variants dropdown */}
    </ProductCard>
  </ProductGrid>
</ProductList>
```

### Step 5: Migration & Testing

**Pre-Migration Checks**:
- [ ] Public catalog endpoints still work
- [ ] Admin routes require admin role
- [ ] No PostgreSQL-specific syntax in D1 queries

**Post-Migration Verification**:
- `npm run build` passes without errors
- `npm run typecheck` shows no TypeScript errors
- `npm run lint` reports zero issues
- `npm test` executes all tests successfully

---

## 📊 Expected File Changes

### New Repositories (~1,000 lines)
```
src/lib/db/d1/categories.ts      # Category management
src/lib/db/d1/cart.ts            # Cart session storage
src/lib/db/d1/coupons.ts         # Coupon definitions & rules
src/lib/db/d1/orders.ts          # Order creation (may update existing)
```

### Schema Migrations (~200 lines)
```
cloudflare/migrations/0002_categories.sql  # Categories table
cloudflare/migrations/0003_cart_items.sql   # Cart storage
cloudflare/migrations/0004_coupons.sql      # Coupons table
cloudflare/migrations/0005_order_addresses.sql  # Addresses
```

### UI Components (~500 lines)
```
src/components/products/category-filter.tsx   # Category dropdown
src/components/products/variant-selector.tsx  # Variant picker
src/components/cart/cart-summary.tsx          # Mini cart
src/components/checkout/checkout-form.tsx     # Order form
```

### Admin Pages (~400 lines)
```
src/app/admin/products/page.tsx         # Product management UI
src/app/admin/categories/page.tsx       # Category management
src/app/admin/coupons/page.tsx          # Coupon management
src/app/admin/inventory/page.tsx        # Inventory dashboard
```

### Documentation (~300 lines)
```
docs/PHASE_6_COMPLETION.md              # Migration report
src/lib/db/d1/README.md                  # Commerce features docs
```

---

## ⚠️ Important Constraints

### DO NOT:
- ❌ Copy Wild Soul Club product images/assets
- ❌ Use WSC branding (names, logos, copy)
- ❌ Replace existing Garieva Prince UI with WSC design
- ❌ Add new dependencies beyond what's allowed
- ❌ Alter NFC/ownership systems during this phase

### DO:
- ✅ Adapt functionality to match GP architecture patterns
- ✅ Use existing D1 repositories as foundation
- ✅ Maintain GP monochrome, editorial aesthetic
- ✅ Follow repository-first pattern (no direct DB queries)
- ✅ Document all schema changes in migrations folder

---

## 🔍 Key Questions to Address

### 1. Categories vs Collections

**Current State**: Collections exist for curated groups  
**New Feature**: Categories for hierarchical organization

**Example Structure**:
```
Electronics
├── Footwear
│   ├── Casual
│   │   └── [Collection: Summer Vibes]
│   └── Formal
└── Apparel
    ├── T-shirts
    └── Hoodies
```

**Database Design**:
- `categories` table: parent-child relationships
- `collections` table: marketing-focused groupings
- Products can belong to multiple collections, one primary category

### 2. Cart Storage Strategy

**Options**:
1. **Session-based storage** — Cart lives in session cookie
2. **Database storage** — Cart items persisted in D1
3. **Hybrid** — Session for active cart, database for abandoned carts

**Recommendation**: Start with session-based, migrate persistent carts to D1 for recovery

### 3. Checkout Flow

**Current State**: No checkout implemented (Phase 7 covers manual payments)  
**Implementation Order**:
1. Create cart (session-based)
2. Add items to cart
3. Collect shipping address
4. Calculate totals (tax, shipping)
5. Create order record
6. Generate order confirmation

---

## 📅 Estimated Timeline

**Phase 6 Duration**: ~8-10 hours of focused work

| Day | Tasks |
|-----|-------|
| **Day 1** | Study WSC repo, analyze existing GP schemas, plan D1 migrations |
| **Day 2** | Implement categories repository + migration files |
| **Day 3** | Implement cart repository + session storage logic |
| **Day 4** | Create checkout UI components + order creation |
| **Day 5** | Build coupon system + admin interfaces |
| **Day 6** | Add variant selectors to product cards |
| **Day 7** | Testing, linting, type checking |
| **Day 8** | Documentation, final verification, commit |

---

## 🧪 Test Scenarios

### Product Listing
```typescript
// Public route: /products
GET /api/products?category=footwear&collection=summer
Response: [Product[]] with variants, stock, prices
```

### Category Filter
```typescript
// Admin route: /admin/categories
POST /api/admin/categories
Body: { name: "Casual", parent_id: null, sort_order: 1 }
```

### Add to Cart
```typescript
// Client action: addToCart({ productId, variantId, quantity })
Session storage in client-side (no API call needed)
Update mini-cart badge count
```

### Checkout Flow
```typescript
// Server route: POST /api/checkout
Body: { cart_items: [], shipping_address: {}, payment_proof: File }
Response: order_number, confirmation_message
```

---

## 📝 Documentation Deliverables

### Required Docs:
1. `docs/PHASE_6_COMPLETION.md` — Full migration report
2. `src/lib/db/d1/README.md` — Commerce features documentation
3. Updated `docs/CLOUDFLARE.md` — Add commerce schema notes
4. `docs/COMMERCE_GUIDE.md` — Feature usage guide

### Code Comments:
- Schema migrations should explain purpose
- Repository functions should include JSDoc
- Admin UI should have inline type hints

---

## 🚀 Success Criteria

Phase 6 is complete when:

✅ **Categories** — Products can be organized hierarchically  
✅ **Collections** — Curated groups work with existing product system  
✅ **Cart** — Users can add/remove items, checkout works  
✅ **Coupons** — Discount codes applied at checkout  
✅ **Admin UI** — All commerce features manageable from admin panel  
✅ **Public Storefront** — Product catalog displays correctly  
✅ **Build Passes** — No errors in `npm run build`  
✅ **Tests Pass** — `npm test` runs without failures  

---

## 📊 Current Repository State

```bash
# Git history (5 commits from this session)
$ git log --oneline -5
548ec3d docs: add PHASE_5_FIXES build error resolution report
9b03458 fix: resolve build errors for development runtime
2868b3b docs: add comprehensive Phase 1-5 completion summary
8cd6649 refactor: remove PostgreSQL runtime, complete D1 migration
709b988 feat: implement product_media and admin authorization repositories

# Branch status
$ git branch -a
* main                    ← Current branch
  remotes/origin/main     ← Up to date with origin

# Untracked files
$ git status --porcelain
?? docs/PHASE_5_FIXES.md  ← New completion report
```

---

## 🎯 Next Actions

1. **Review this plan** — Understand Phase 6 scope and constraints
2. **Clone WSC repo** — https://github.com/IsaacTalb/wildsoulclub
3. **Set up local dev environment** — Run `npm ci` if needed
4. **Start analysis** — Identify migration paths for each feature
5. **Begin implementation** — Follow Day 1 plan above

---

**Phase 6 Plan Complete. Ready to migrate commerce features from Wild Soul Club reference.** 🎉