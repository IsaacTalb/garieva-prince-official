import { z } from "zod";

export const identitySchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().max(200).optional(),
});

const visibilityFlagSchema = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((value) => value === true || value === 1);

const nullableUrlSchema = z
  .union([
    z.url().max(500).refine((value) => /^https?:\/\//i.test(value)),
    z.literal(""),
    z.null(),
  ])
  .transform((value) => (value === "" ? null : value));

export const profileSchema = z.strictObject({
  display_name: z.string().trim().min(1).max(100),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/).nullable(),
  phone: z.string().trim().max(30).nullable(),
  bio: z.string().trim().max(500).nullable(),
  instagram_url: nullableUrlSchema,
  facebook_url: nullableUrlSchema,
  tiktok_url: nullableUrlSchema,
  telegram_url: nullableUrlSchema,
  show_profile_publicly: z.boolean(),
  show_wardrobe_publicly: z.boolean(),
  show_avatar_publicly: z.boolean(),
  show_instagram: z.boolean(),
  show_facebook: z.boolean(),
  show_tiktok: z.boolean(),
  show_telegram: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const appUserSchema = z.object({
  id: z.string().min(1).max(255),
  email: z.email().nullable(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  profile_visibility: z.enum(["private", "public"]),
  bio: z.string().nullable(),
  instagram_url: z.string().nullable(),
  facebook_url: z.string().nullable(),
  tiktok_url: z.string().nullable(),
  telegram_url: z.string().nullable(),
  show_profile_publicly: visibilityFlagSchema,
  show_wardrobe_publicly: visibilityFlagSchema,
  show_avatar_publicly: visibilityFlagSchema,
  show_instagram: visibilityFlagSchema,
  show_facebook: visibilityFlagSchema,
  show_tiktok: visibilityFlagSchema,
  show_telegram: visibilityFlagSchema,
});

export type AppUser = z.infer<typeof appUserSchema>;

export function verifiedIdentity(input: unknown) {
  const identity = identitySchema.parse(input);
  return {
    auth0Sub: identity.sub,
    // Email never links accounts or authorizes roles.
    email: identity.email_verified === true ? identity.email?.toLowerCase() ?? null : null,
    displayName: identity.name ?? null,
  };
}
