import { z } from "zod";

export const identitySchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().max(200).optional(),
});

export const profileSchema = z.strictObject({
  display_name: z.string().trim().min(1).max(100),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/).nullable(),
  phone: z.string().trim().max(30).nullable(),
  profile_visibility: z.enum(["private", "public"]),
});

export const appUserSchema = z.object({
  id: z.uuid(),
  auth0_sub: z.string(),
  email: z.email().nullable(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  profile_visibility: z.enum(["private", "public"]),
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
