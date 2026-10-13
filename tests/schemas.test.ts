import assert from "node:assert/strict";
import { test } from "node:test";
import { productInputSchema, variantInputSchema } from "../src/schemas/catalog";
import { verifiedIdentity, profileSchema } from "../src/schemas/user";
import { mediaInputSchema, privateObjectKeySchema } from "../src/schemas/media";
import { authConfigSchema, r2ConfigSchema } from "../src/lib/config";

const variant = { sku: "GP-001-S", size: "S", color: "Ink", price_minor: 10000, stock_on_hand: 2 };
const uuid = "7c45442e-f1d2-4f25-b8c4-3d32f1843411";

test("catalog rejects fractional money, negative stock, and ambiguous variants", () => {
  assert.equal(variantInputSchema.safeParse({ ...variant, price_minor: 1.5 }).success, false);
  assert.equal(variantInputSchema.safeParse({ ...variant, stock_on_hand: -1 }).success, false);
  const product = { name: "Test piece", slug: "test-piece", description: "", currency: "USD", status: "draft", variants: [variant] };
  assert.equal(productInputSchema.safeParse(product).success, true);
  assert.equal(productInputSchema.safeParse({ ...product, variants: [variant, { ...variant, sku: "gp-001-s" }] }).success, false);
  assert.equal(productInputSchema.safeParse({ ...product, variants: [variant, { ...variant, sku: "OTHER", color: "ink" }] }).success, false);
  assert.equal(productInputSchema.safeParse({ ...product, variants: [] }).success, false);
});

test("identity mapping trusts verified emails only and never accepts profile role changes", () => {
  assert.equal(verifiedIdentity({ sub: "auth0|customer", email: "person@example.com", email_verified: false }).email, null);
  assert.equal(verifiedIdentity({ sub: "auth0|customer", email: "PERSON@example.com", email_verified: true }).email, "person@example.com");
  assert.throws(() => verifiedIdentity({ email: "person@example.com" }));
  assert.equal(profileSchema.safeParse({ display_name: "Person", username: null, phone: null, profile_visibility: "private", role: "admin" }).success, false);
});

test("media validation rejects unbounded files, active content, and caller-specified keys", () => {
  const media = { purpose: "order", ownerId: uuid, contentType: "image/png", byteLength: 1000 };
  assert.equal(mediaInputSchema.safeParse(media).success, true);
  for (const invalid of [{ byteLength: 0 }, { byteLength: 11 * 1024 * 1024 }, { contentType: "image/svg+xml" }, { ownerId: "../escape" }, { objectKey: "product/another-user" }]) {
    assert.equal(mediaInputSchema.safeParse({ ...media, ...invalid }).success, false);
  }
  assert.equal(privateObjectKeySchema.safeParse(`order/${uuid}/${uuid}.png`).success, true);
  assert.equal(privateObjectKeySchema.safeParse(`product/${uuid}/${uuid}.png`).success, false);
});

test("configuration rejects insecure identities and shared public/private buckets", () => {
  const auth = { AUTH0_DOMAIN: "tenant.auth0.com", AUTH0_CLIENT_ID: "test-client", AUTH0_CLIENT_SECRET: "test-only", AUTH0_SECRET: "a".repeat(64), APP_BASE_URL: "http://localhost:3000" };
  assert.equal(authConfigSchema.safeParse(auth).success, true);
  assert.equal(authConfigSchema.safeParse({ ...auth, AUTH0_DOMAIN: "https://tenant.auth0.com" }).success, false);
  assert.equal(authConfigSchema.safeParse({ ...auth, APP_BASE_URL: "https://example.com/redirect" }).success, false);
  assert.equal(authConfigSchema.safeParse({ ...auth, AUTH0_SECRET: "short" }).success, false);
  const r2 = { R2_ACCOUNT_ID: "a".repeat(32), R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test", R2_PUBLIC_BUCKET_NAME: "public", R2_PRIVATE_BUCKET_NAME: "private", R2_PUBLIC_BASE_URL: "https://images.example.com" };
  assert.equal(r2ConfigSchema.safeParse(r2).success, true);
  assert.equal(r2ConfigSchema.safeParse({ ...r2, R2_PRIVATE_BUCKET_NAME: "public" }).success, false);
});
