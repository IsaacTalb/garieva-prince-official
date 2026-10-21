import { z } from "zod";

export const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const moneySchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const variantInputSchema = z.strictObject({
  sku: z.string().trim().min(1).max(100),
  size: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(50),
  price_minor: moneySchema,
  stock_on_hand: z.number().int().nonnegative().max(2147483647),
});

export const productInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  description: z.string().max(10000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(["draft", "published", "archived"]),
  variants: z.array(variantInputSchema).min(1).max(100),
}).superRefine((product, ctx) => {
  const skus = new Set<string>();
  const options = new Set<string>();
  product.variants.forEach((variant, index) => {
    const sku = variant.sku.toLowerCase();
    const option = JSON.stringify([variant.size.toLowerCase(), variant.color.toLowerCase()]);
    if (skus.has(sku) || options.has(option)) ctx.addIssue({ code: "custom", message: "Variant SKUs and size/color combinations must be unique", path: ["variants", index] });
    skus.add(sku);
    options.add(option);
  });
});

export const publicProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: slugSchema,
  description: z.string(),
  image_url: z.url().nullable().default(null),
  image_alt: z.string().nullable().default(null),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;
