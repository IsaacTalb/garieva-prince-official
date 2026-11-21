import "server-only";
import { createUser, getUserByEmail } from "@/lib/db/d1/users";
import { hasAdminRole as hasD1AdminRole } from "@/lib/db/d1/admin";
import { verifiedIdentity } from "@/schemas/user";

export async function resolveAppUser(claims: unknown) {
  const identity = verifiedIdentity(claims);
  if (!identity.email) {
    throw new Error("A verified email address is required to resolve an account");
  }
  const existingUser = await getUserByEmail(identity.email);
  if (existingUser) return existingUser;

  return createUser({
    email: identity.email,
    name: identity.displayName,
  });
}

export async function hasAdminRole(userId: string) {
  return hasD1AdminRole(userId, "admin");
}
