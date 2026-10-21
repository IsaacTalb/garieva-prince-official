import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth0, isAuthConfigured } from "@/lib/auth/client";
import { hasAdminRole, resolveAppUser } from "@/lib/db/users";
import { ConfigurationError } from "@/lib/config";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Sign in is required." : "Access denied.");
  }
}

export const getCurrentUser = cache(async () => {
  if (!isAuthConfigured()) throw new ConfigurationError("Authentication");
  const session = await getAuth0().getSession();
  return session ? resolveAppUser(session.user) : null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AccessError(401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!(await hasAdminRole(user.id))) throw new AccessError(403);
  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();
  // Fixed internal return destination; no user-controlled redirect URL.
  if (!user) redirect("/auth/login?returnTo=%2Faccount");
  return user;
}
