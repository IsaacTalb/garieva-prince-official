# Garieva Prince Architecture

## Core rule
Garieva Prince separates a product model from an individual physical piece.

```
products -> product_variants -> product_items -> nfc_tags
                                      |
                                      -> ownerships
```

Example:
- Product: Anniversary Jersey
- Variant: Black / L
- Physical item: GP001
- NFC: one NTAG 424 DNA tag
- Current owner: one active ownership row

The product item identity never changes when ownership transfers.

## Infrastructure
- Cloudflare Workers: application/API runtime
- Cloudflare D1: SQL data
- Cloudflare R2: media and private uploaded documents
- Brevo: transactional email

## Authentication
Custom passwordless email OTP.

Security requirements:
- OTP values are never stored in plaintext.
- OTP hashes are bound to normalized email.
- OTPs expire and are single-use.
- attempt counts are rate-limited.
- sessions use random opaque tokens.
- only session token hashes are stored in D1.
- browser receives Secure, HttpOnly, SameSite cookies.
- admin authorization is a database role check, not an email allowlist.

## Email verification flow
```
email -> request OTP -> Brevo -> verify OTP -> local user -> session
```

New users continue to profile setup:
- name
- username
- phone
- terms/privacy consent

## NFC
NTAG 424 DNA secrets must never be placed in browser JavaScript or committed to Git.

The NFC module will later support:
- tag UID registration
- provisioning status
- SDM verification
- key versioning
- pre-install QA
- post-install QA

Actual AES key material is intentionally not represented in the D1 schema.

## Payment + claim
```
checkout
 -> payment proof
 -> admin approval
 -> physical product_item allocation
 -> activate claim code
 -> Brevo confirmation email
 -> customer receives item
 -> NFC tap
 -> claim code
 -> ownership row
```

Payment approval must be idempotent.

## Deployment
Cloudflare's current full-stack Next.js direction is Workers rather than Pages.
The exact Next.js-on-Workers adapter migration should be done as a dedicated step and tested before production deployment.
