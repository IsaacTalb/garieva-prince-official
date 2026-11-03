# Garieva Prince Official

Garieva Prince is being rebuilt as a premium commerce + NFC digital ownership platform.

## Direction

The storefront reuses proven ideas from the Wild Soul Club project, while Garieva Prince has its own design, authentication, ownership, NFC and resale system.

### Application
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Cloudflare
- Workers for the full-stack application/API
- D1 for relational data
- R2 for product media, profile photos, payment proofs and delivery documents
- Cloudflare custom domains/CDN

### Authentication
Custom passwordless account system:
1. enter email
2. receive 6-digit email verification code through Brevo
3. verify email
4. new accounts complete name, username and phone
5. server creates an HttpOnly session

No Clerk and no Supabase Auth.

### Email
Brevo transactional email API is used for:
- sign-in/sign-up verification
- payment approval
- ownership claim-code delivery
- shipment/delivery updates
- ownership transfers
- resale events
- restock notifications

### NFC
Target physical chip: NXP NTAG 424 DNA.

Each physical garment is represented by a `product_items` record such as `GP001`.
The NFC tag is permanently associated with the physical item; ownership changes in the database without rewriting the product identity.

## Safety
The previous June implementation is preserved on the `legacy/pre-rebuild` branch.

## Current rebuild branch
`codex/gp-cloudflare-rebuild`

## Next engineering steps
- migrate/adapt WSC commerce UI and admin features
- add Cloudflare Worker runtime/bindings
- implement D1 repository layer
- implement OTP request/verify/session endpoints
- implement account + wardrobe UI from the supplied GP mockups
- implement manual payment approval email and ownership claim code delivery
- implement NFC provisioning/SDM verification adapter
- implement resale + ownership transfer
