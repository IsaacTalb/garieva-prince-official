# Reference UI alignment

The user explicitly authorized matching the reference UI after the initial
independent visual foundation. Reference revision inspected:
`77c8bd94e9136bcc077a4305bd53c179c200fa30`.

Adapted presentation: 48px liquid-glass header and centered wordmark, shop menu,
search dialog, mobile slide-out navigation, full-screen collection hero and
centered glass CTA, responsive scattered product display, monochrome typography
and white surfaces, brand signoff, four-column footer, account profile cards,
cart/wishlist empty states, two-column checkout shell, and admin sidebar/top bar.

All content and assets remain GP-specific. No reference images/logos, product
data, contact details, paid font files, Supabase Auth, or browser database access
were copied. Helvetica/Arial provides the same sans-serif visual direction with
no external font fetch. No fake product records or purchase state were added.
GP campaign imagery and real catalog records are still needed for populated
screens. Cart, wishlist, checkout, and admin management are UI-only until their
planned services are implemented. Auth0, application UUID identity, existing
authorization checks, private R2 media, and migrations remain intact.

Catalog reads additionally select the first public product image through a
lateral join. Grant the runtime role SELECT on public.product_media as documented
in ARCHITECTURE.md. No migration or remote database mutation is required by this
UI update.

Validation: lint, production build, and the existing five schema/PostgreSQL tests
passed. Chromium checks covered desktop search, mobile navigation, Escape and
focus restoration, and 40 route/viewport combinations across 320, 375, 768, 1280,
and 1440px. No horizontal overflow or browser runtime errors were found. Auth
and account APIs returned 503 without credentials; unknown product detail routes
returned 404; unauthorized admin pages did not expose the sidebar. Populated
provider-backed catalog and signed-in admin/profile views still require real
provider configuration for end-to-end validation.
