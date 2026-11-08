# GARIEVA PRINCE — LOCAL AI DEVELOPMENT MASTER PROMPT

You are the senior software engineer continuing development of the existing Garieva Prince project.

Repository:

https://github.com/IsaacTalb/garieva-prince-official

Reference project:

https://github.com/IsaacTalb/wildsoulclub

IMPORTANT:

Do not rebuild the project from scratch.

Do not replace the current UI without understanding it.

Do not copy Wild Soul Club branding, content, products, assets, authentication or database configuration.

Wild Soul Club is only a functional and architectural reference.

The existing Garieva Prince repository already contains work from previous development phases.

Before making changes:

1. inspect the entire repository
2. inspect git status
3. inspect current branch
4. inspect recent commits
5. read:
   - README.md
   - docs/ARCHITECTURE.md
   - docs/IMPLEMENTATION_PLAN.md
   - docs/UI_ALIGNMENT.md
6. inspect package.json
7. inspect src/
8. inspect cloudflare/
9. inspect current authentication/database code
10. understand what is already implemented before writing code

Never delete working functionality simply because another implementation would be easier.

==================================================
PROJECT GOAL
==================================================

Garieva Prince is a premium fashion e-commerce platform with:

- online store
- customer accounts
- individual physical garment identities
- NXP NTAG 424 DNA NFC authentication
- digital ownership
- ownership history
- wardrobe
- resale marketplace
- ownership transfer
- manual payment verification
- automated transactional email
- delivery challan/proof
- restock notification
- admin management

==================================================
FINAL TECHNOLOGY DIRECTION
==================================================

Frontend/application:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- App Router
- Server Components by default

Infrastructure:

- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Cloudflare CDN/custom domains

Email:

- Brevo transactional email

Authentication:

CUSTOM authentication.

Do NOT use:
- Clerk
- Supabase Auth

Auth0/PostgreSQL code may currently exist because it was introduced in an earlier merged PR.

Treat those as TRANSITIONAL.

Do not add new dependencies on Auth0 or PostgreSQL.

They will be removed once D1/custom authentication is working.

==================================================
CUSTOM ACCOUNT FLOW
==================================================

Target authentication flow:

Enter Email
    ↓
Brevo sends 6-digit OTP
    ↓
Verify Email
    ↓
Existing User?
    ↓
Yes → Sign In

New User?
    ↓
Name
Username
Phone Number
Terms & Privacy
    ↓
Create Account
    ↓
Account

Do not require traditional passwords.

Sessions:

- secure random opaque token
- store only session token hash
- HttpOnly cookie
- Secure cookie in production
- SameSite=Lax or appropriate secure setting
- server validates every session

Never trust user_id sent from frontend.

==================================================
ACCOUNT EXPERIENCE
==================================================

Account sections:

WARDROBE
ORDERS
PROFILE

Profile:

- avatar
- display name
- username
- phone
- verified email
- bio

Social:

- Instagram
- Facebook
- TikTok
- Telegram

Privacy settings:

- public/private profile
- show avatar
- show wardrobe
- individual social visibility

==================================================
PRODUCT MODEL
==================================================

VERY IMPORTANT:

A generic product and a physical garment are NOT the same thing.

Example:

PRODUCT:
Anniversary Jersey

VARIANT:
Black / L

PHYSICAL PRODUCT ITEM:
GP001

Architecture:

products
    ↓
product_variants
    ↓
product_items
    ↓
nfc_tags

A product may have:

GP001
GP002
GP003
...
GP100

Every physical item has its own permanent identity.

==================================================
NFC
==================================================

Target chip:

NXP NTAG 424 DNA

Each physical item:

GP001
    ↓
one NTAG 424 DNA tag

NFC identity remains permanently associated with GP001.

Ownership changes do NOT require rewriting the NFC identity.

NFC responsibilities:

- UID registration
- provisioning
- key version
- Secure Dynamic Messaging
- server verification
- QA
- authenticity status

NEVER:

- store AES secrets in browser code
- commit AES secrets
- expose AES secrets through public APIs
- treat a static NFC URL as authenticity proof

NFC authentication and digital ownership are different systems.

==================================================
OWNERSHIP
==================================================

Ownership belongs to product_items.

Example:

GP001

Owner #1
Alyx
Oct 2026 → Feb 2027

Owner #2
John
Feb 2027 → Current

Never overwrite historical ownership.

There must only be ONE current owner.

==================================================
FIRST SALE CLAIM FLOW
==================================================

Order
    ↓
Customer uploads payment proof
    ↓
Admin manually approves payment
    ↓
Physical product_item allocated
    ↓
Ownership claim code activated
    ↓
Brevo email automatically sent
    ↓
Customer receives item
    ↓
Customer taps NFC
    ↓
Authenticity verified
    ↓
Customer enters claim code
    ↓
Ownership created

Claim code:

- securely generated
- stored hashed
- one-time use
- cannot be reused
- cannot be publicly exposed

==================================================
MANUAL PAYMENT
==================================================

Customer uploads payment proof.

Admin can:

Approve
Reject

When APPROVED:

transaction must be idempotent.

It should:

1. approve payment
2. update order
3. allocate physical product item
4. activate claim code
5. send confirmation email
6. record audit event

Do not accidentally process approval twice.

==================================================
DELIVERY
==================================================

Admin can upload delivery challan/proof.

Allowed:

PDF
JPEG
PNG
WEBP

Store in private R2.

Customer can view their own delivery document from:

Account → Orders → Order Detail

No customer may access another customer's document.

==================================================
RESELL
==================================================

Only the current verified owner can list a garment.

Flow:

Owner
    ↓
List GP001
    ↓
Buyer purchases
    ↓
Buyer pays GP
    ↓
GP approves payment
    ↓
Seller ships
    ↓
Delivery confirmed
    ↓
Ownership transfer
    ↓
Seller loses GP001 permissions
    ↓
Buyer becomes current owner
    ↓
GP service fee 5%
    ↓
Seller receives 95%

Do NOT log seller out.

Only remove control over the sold product_item.

==================================================
RESTOCK
==================================================

Sold-out product/variant:

NOTIFY ME

Guest:
email

Logged-in user:
verified email automatically available

When stock changes from:

0 → greater than 0

send Brevo restock notification once.

==================================================
UI REQUIREMENTS
==================================================

Garieva Prince style:

- premium
- modern fashion
- editorial
- mostly monochrome
- clean typography
- whitespace
- smooth transitions
- responsive
- mobile first
- not generic SaaS design

Product cards:

Product Image

Product Name
Short Caption

color dots

Price

Example:

ANNIVERSARY JERSEY
Oversized Football Jersey

● ● ●

95,000 MMK

==================================================
PERFORMANCE
==================================================

Client specifically requested fast navigation.

Prefer:

- Server Components
- cached public catalog data
- minimal client JS
- Next/Image
- correct image sizes
- route prefetch
- Suspense
- loading.tsx
- parallel server queries
- dynamic import for heavy UI
- CDN/R2 caching

Avoid unnecessary:

useEffect fetching
large state libraries
animation libraries
full-page loaders
client-side waterfalls

==================================================
WORKING RULES
==================================================

Before changing code:

Explain briefly:

1. what currently exists
2. what you are changing
3. why

Then implement.

After implementation run:

npm ci

npm run lint

npm run typecheck

npm test

npm run build

Fix errors before finishing.

Do NOT:

- claim something works without testing it
- silently remove existing features
- replace architecture without reason
- commit secrets
- generate fake integration values
- implement mock security as production security

At the end of EVERY phase provide:

DONE
- list completed work

FILES CHANGED
- list important files

TEST RESULTS
- npm ci
- lint
- typecheck
- tests
- build

COMMIT
- commit hash
- commit message

STILL TODO
- clear remaining work

NEXT RECOMMENDED PHASE
- one recommended next task

Do not start the next phase automatically.

Stop after the current phase.


============================================================
PHASE 1 — CLEAN AND VERIFY CURRENT REPOSITORY
============================================================

Use the MASTER PROMPT above.

Your task for this phase is repository reconciliation.

The project has previously merged PR #3 and has/had PR #4 for the Cloudflare migration.

Do not implement major new features yet.

First inspect:

git status
git branch
git log --oneline -15

Inspect:

package.json
package-lock.json
src/
cloudflare/
supabase/
README.md
docs/

Search entire repository for:

Clerk
Supabase
Auth0
postgres
DATABASE_URL
R2
Brevo
D1
NFC
NTAG
ownership

Report where transitional infrastructure remains.

Check whether:

- old root app/ directories exist
- src/app is canonical
- duplicate auth implementations exist
- duplicate database schemas exist
- stale documentation exists
- obsolete packages remain

Do NOT delete Auth0/PostgreSQL yet unless replacement runtime already works.

Ensure repository has one clear documented migration direction:

Cloudflare Workers + D1 + R2 + Brevo + custom auth.

Run the full verification suite.

Fix simple structural/build problems.

Commit:

chore: reconcile GP rebuild foundation

Stop after completion.


============================================================
PHASE 2 — CLOUDFLARE WORKER + D1 FOUNDATION
============================================================

Continue from current working repository.

Goal:

Make Cloudflare D1 available to the Next.js application.

Do NOT remove the current PostgreSQL runtime until D1 is functional.

Implement:

Cloudflare Worker configuration
Wrangler configuration
D1 database binding
R2 bindings where appropriate
environment typing

Recommended bindings:

DB
MEDIA

Create a Cloudflare database abstraction under:

src/lib/db/

Do not scatter direct DB queries throughout components.

Suggested structure:

src/lib/db/
  d1.ts
  users.ts
  products.ts
  orders.ts
  ownership.ts

The rest of the application should call repository functions.

Implement basic D1 health/test query.

Do not expose DB binding to client components.

Ensure migrations under:

cloudflare/migrations/

are valid SQLite/D1 SQL.

Review current 0001_core.sql carefully.

Fix constraints/indexes if necessary.

Do not drop existing production data.

This project is not yet production migrated.

Add documentation:

docs/CLOUDFLARE.md

Include:

local D1 setup
migration commands
development commands
production binding names

Run full test/build suite.

Commit:

feat: add Cloudflare Worker and D1 runtime foundation

Stop.


============================================================
PHASE 3 — CUSTOM BREVO OTP AUTHENTICATION
============================================================

Implement the real custom authentication system.

Remove dependency on Auth0 ONLY after this phase is working.

Endpoints:

POST /api/auth/request-code

Input:

email

Behavior:

normalize email

rate limit

invalidate or supersede previous active OTP if appropriate

generate 6-digit OTP

hash OTP

store hash in D1

set expiry around 10 minutes

send via Brevo

generic success response

Never reveal whether account exists.


POST /api/auth/verify-code

Input:

email
code

Validate:

active OTP
not expired
not consumed
attempt limit
constant-time-safe comparison where practical

On success:

consume OTP

find user

existing user:
create session

new user:
create provisional verified identity and route to profile setup

Generate:

secure opaque session token

store ONLY session hash in D1

set cookie:

HttpOnly
Secure production
SameSite=Lax
Path=/
appropriate expiry


POST /api/auth/logout

revoke session

clear cookie


GET /api/auth/session

return safe current-user information.

Implement:

src/lib/auth/session.ts
src/lib/auth/otp.ts
src/lib/auth/cookies.ts
src/lib/auth/rate-limit.ts

Adapt current /account/sign-in UI.

Required UX:

email
Continue

then:

Check Your Email

6 code inputs or one accessible code input

Verify

Resend Code

After resend show:

Only the newest verification code will work.

New account:

/account/setup

Name
Username
Phone
Terms

Email displayed read-only.

After this is tested:

remove Auth0:
@auth0/nextjs-auth0
Auth0 env
Auth0 proxy/session code

Run full suite.

Commit:

feat: implement Brevo passwordless authentication

Stop.


============================================================
PHASE 4 — MIGRATE USERS/ADMIN/CATALOG FROM POSTGRES TO D1
============================================================

Now migrate existing server repositories from PostgreSQL to D1.

Replace:

postgres package
DATABASE_URL
PostgreSQL repository implementation

with D1.

Do NOT alter working UI unnecessarily.

Implement repositories for:

users
admins
products
variants
collections
drops
product media

Public catalog should continue working.

Admin access:

admins table

roles:

super_admin
admin
manager

Authentication does NOT automatically make someone admin.

Implement:

requireUser()
requireAdmin()
requireRole()

All authorization server-side.

Remove obsolete:

postgres dependency
Supabase-era migrations
DATABASE_URL documentation

only after migration is fully passing.

Run full suite.

Commit:

refactor: migrate GP application data to Cloudflare D1

Stop.


============================================================
PHASE 5 — CLOUDFLARE R2 MEDIA
============================================================

Replace transitional S3 credential-based R2 access with Cloudflare-native R2 binding where possible.

Use R2 for:

product media
profile photos
payment receipts
delivery challans
resale photos

Separate public/private behavior logically.

Product media:

public/cacheable

Private:

payment receipts
delivery documents
private profile data

Never expose private bucket objects directly.

Implement secure download/read authorization.

Validate:

MIME
extension
size
ownership/access

Prefer:

AVIF
WEBP
JPEG
PNG

for product images.

SVG uploads should remain disabled unless explicitly needed.

Generate non-guessable object keys.

Persist object keys, not temporary signed URLs.

Run full suite.

Commit:

feat: migrate GP media storage to Cloudflare R2 bindings

Stop.


============================================================
PHASE 6 — WSC COMMERCE FEATURE MIGRATION
============================================================

Study:

https://github.com/IsaacTalb/wildsoulclub

Use it only as functional reference.

Bring mature features into GP architecture:

products
categories
collections
drops
archive sales
product variants
inventory
cart
checkout
orders
manual payments
coupons
admin product management

Do not copy:

branding
products
images
text
auth
Supabase code

Adapt functionality to D1/R2.

Product variant requirements:

size
color_name
color_hex
stock
SKU
price
sale price

GP product card UI must include:

image
name
caption
color dots
price

Color dots must use actual color_hex stored in DB.

Sold-out variants should be disabled visually.

Run full suite.

Commit:

feat: migrate core commerce workflows to GP

Stop.


============================================================
PHASE 7 — MANUAL PAYMENT + EMAIL CLAIM CODE
============================================================

Implement complete manual payment workflow.

Customer:

checkout
select payment method
upload payment proof
submit order

Admin:

review payment

APPROVE
REJECT

Approval must run transactionally/idempotently.

When approved:

1. payment approved
2. order marked paid/processing
3. stock finalized
4. physical product_item allocated
5. claim code generated/activated
6. Brevo confirmation email queued/sent
7. audit log created

For multiple NFC garments:

each physical garment gets its own:

serial
claim code

Email example:

ANNIVERSARY JERSEY
Size L
Serial GP001

Ownership Code:
XXXX-XXXX-XXXX

Never expose the claim code through ordinary APIs.

Store hash in D1.

Do not store plaintext longer than needed for issuance.

Implement email event tracking.

Prevent duplicate emails from retries.

Run full suite.

Commit:

feat: add payment approval and ownership-code delivery

Stop.


============================================================
PHASE 8 — ACCOUNT / WARDROBE / PROFILE
============================================================

Build the GP account experience.

Tabs:

WARDROBE
ORDERS
PROFILE

WARDROBE:

show only physical product_items currently owned.

Card:

product image
product name
size
serial
Owned Since

Example:

ANNIVERSARY JERSEY

Size L · GP001

Owned Since 06 Oct 2026


PROFILE:

avatar
display name
username
bio

Instagram
Facebook
TikTok
Telegram

visibility settings


CHECKOUT DETAILS:

name
phone
address
township
city


PUBLIC PROFILE:

/u/[username]

Display only explicitly public information.

Never expose:

email
phone
delivery address
orders
claim codes
private history

Run full suite.

Commit:

feat: build GP wardrobe and profile experience

Stop.


============================================================
PHASE 9 — NFC DIGITAL PASSPORT FOUNDATION
============================================================

Implement NFC-facing application architecture.

IMPORTANT:

Do NOT fake AES/SDM cryptography.

Create:

src/lib/nfc/

Structure:

types.ts
repository.ts
verify.ts
provisioning.ts
README.md

Implement digital passport route:

/piece/[publicId]

Example:

/piece/GP001

Display:

product
model
drop
size
color
serial

authenticity status

current public owner

ownership history where permitted

NFC verification endpoint:

/nfc/verify

Architecture must allow:

NTAG 424 DNA
Secure Dynamic Messaging
CMAC verification
tap counter/replay handling
key version

At this phase, if actual physical-tag cryptography is not implemented yet:

clearly mark verification adapter as pending.

Do not return fake "Authentic" results.

States:

VERIFIED
UNVERIFIED
INVALID
ERROR

Run full suite.

Commit:

feat: add NFC digital passport architecture

Stop.


============================================================
PHASE 10 — NFC ADMIN PROVISIONING
============================================================

Build:

/admin/nfc

/admin/nfc/provision

Workflow:

Select physical item

Example:

GP001

Display:

Product
Variant
Serial
Current NFC status

Then:

PLACE NFC TAG ON READER

The web application should define a provisioning adapter/interface.

Actual USB NFC communication may need:

desktop helper
local service
SDK
PC/SC reader integration

Do not assume browser NFC can perform all NTAG 424 DNA provisioning.

Design clear separation:

GP website/admin
    ↓
Provisioning API/interface
    ↓
Local provisioning utility
    ↓
USB NFC reader
    ↓
NTAG 424 DNA

Support states:

unassigned
testing
provisioned
qa_passed
retired

Workflow:

Read tag
Verify expected chip
Read UID
Associate UID → GP001
Provision SDM/security
Verify
Pre-install QA
Install tag
Post-install QA

Do not store AES keys in D1 plaintext.

Add documentation for future physical reader integration.

Commit:

feat: add NTAG 424 DNA provisioning workflow

Stop.


============================================================
PHASE 11 — OWNERSHIP CLAIM
============================================================

Implement:

/piece/[id]/claim

Requirements:

authenticated user

valid NFC-linked item

valid active claim code

approved original order

item currently unclaimed

claim code hash match

Transaction:

consume code

create ownership row

is_current = true

update product_item status = owned

audit event

Prevent:

double claim
race condition
claim replay

After claim:

piece page shows:

CURRENT OWNER

avatar
display name
username
public social icons

Run concurrency-oriented tests.

Commit:

feat: implement physical garment ownership claim

Stop.


============================================================
PHASE 12 — OWNERSHIP TRANSFER
============================================================

Only current owner can initiate transfer.

Create:

ownership_transfers

States:

initiated
recipient_pending
recipient_verified
confirmed
completed
cancelled
expired

Do NOT immediately remove ownership when initiated.

On completion transactionally:

old ownership:

is_current = false
ended_at = now

new ownership:

new row
is_current = true

Product item remains:

GP001

NFC remains associated with GP001.

Seller/previous owner stays logged in.

They only lose permissions for GP001.

Audit transfer.

Commit:

feat: implement secure ownership transfer

Stop.


============================================================
PHASE 13 — RESALE MARKETPLACE
============================================================

Implement resale system.

Current owner can:

List for Resale

Fields:

price
condition
description
photos

Buyer:

checkout through GP

Payment goes to GP.

Workflow:

listing active
buyer order
payment pending
GP approves
seller notified
seller ships
delivery confirmed
ownership transferred
seller payout ready

Fee:

GP = 5%

Seller = 95%

Example:

400,000 MMK

GP:
20,000

Seller:
380,000

Prevent:

double listing
double sale
transfer while resale active
two current owners

Seller payout only after:

delivery + ownership transfer conditions satisfied

Admin:

approve/mark payout

store payout reference.

Commit:

feat: implement GP resale and seller payout workflow

Stop.


============================================================
PHASE 14 — DELIVERY CHALLAN
============================================================

Admin order page:

Upload Delivery Challan

Fields:

courier
tracking number
file

Allowed:

PDF
JPEG
PNG
WEBP

Store private in R2.

Customer:

Account
→ Orders
→ Order Detail

Display:

Order shipped

Courier
Tracking Number

Delivery Document
[View Challan]

Authorize every private document read.

Audit:

upload
replace
remove

Commit:

feat: add delivery challan workflow

Stop.


============================================================
PHASE 15 — RESTOCK NOTIFICATIONS
============================================================

If selected variant is sold out:

NOTIFY ME

Guest:

enter email

Logged-in:

use verified account email

Subscribe to:

product_id
variant_id

Prevent duplicate active subscriptions.

Trigger only when:

stock goes 0 → > 0

Send Brevo email:

ANNIVERSARY JERSEY IS BACK

Black / Size L

[SHOP NOW]

Mark subscription notified after successful send.

Implement retry/idempotency.

Commit:

feat: add restock email notifications

Stop.


============================================================
PHASE 16 — PERFORMANCE
============================================================

Perform full performance audit.

Client specifically requested minimal loading between pages.

Review:

/
products
product detail
collections
drops
archive sale
cart
checkout
account
wardrobe
orders
piece
ownership
resale
admin

Find:

client-component overuse
fetch waterfalls
duplicate queries
large bundles
unoptimized images
blocking components
unnecessary animations
uncached public data
slow navigation

Fix using:

Server Components
Promise.all
Suspense
Next/Image
R2/CDN cache
route prefetch
loading.tsx
dynamic import
D1 indexing
minimal hydration

Do not sacrifice correctness/security for speed.

Run production build.

Commit:

perf: optimize GP storefront and account experience

Stop.


============================================================
PHASE 17 — SECURITY HARDENING
============================================================

Perform security review.

Check:

OTP brute force
OTP replay
session fixation
session theft
CSRF
XSS
IDOR
rate limiting
R2 private object authorization
payment proof access
delivery document access
claim code leakage
ownership authorization
resale authorization
admin authorization
NFC replay
input validation

Every sensitive operation must verify authorization server-side.

Never trust:

user_id
owner_id
price
payment amount
ownership state

coming from browser.

Add audit logs for:

payment approval
claim
transfer
resale
payout
NFC provisioning
admin actions

Commit:

security: harden GP authentication ownership and commerce

Stop.


============================================================
PHASE 18 — FINAL PRODUCTION READINESS
============================================================

Do not add new features.

Run:

npm ci
npm run lint
npm run typecheck
npm test
npm run build

Fix everything.

Audit environment variables.

Produce:

docs/PRODUCTION.md

Include:

Cloudflare Worker setup

D1 creation
D1 migration

R2 bucket setup

Brevo setup

custom domain

production secrets

NFC provisioning requirements

backup strategy

deployment steps

rollback steps

Create launch checklist:

AUTH
DATABASE
R2
EMAIL
COMMERCE
PAYMENT
OWNERSHIP
NFC
RESALE
ADMIN
PERFORMANCE
SECURITY

Clearly identify anything still blocked by:

physical NTAG 424 DNA hardware
USB NFC reader
production domain
Brevo production credentials
Cloudflare resources
real payment information
real product content

Commit:

chore: prepare Garieva Prince for production launch

Stop.