import { z } from "zod";

export const mediaInputSchema = z.strictObject({
  purpose: z.enum(["product", "profile", "order"]),
  ownerId: z.uuid(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  byteLength: z.number().int().positive().max(10 * 1024 * 1024),
});

export const privateObjectKeySchema = z.string().regex(/^(order|profile)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/);
export type MediaInput = z.infer<typeof mediaInputSchema>;
