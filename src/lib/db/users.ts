import "server-only";
import { getDatabase } from "@/lib/db/client";
import { appUserSchema, verifiedIdentity } from "@/schemas/user";

export async function resolveAppUser(claims: unknown) {
  const identity = verifiedIdentity(claims);
  const sql = getDatabase();
  const rows = await sql`
    insert into public.users (auth0_sub, email, display_name)
    values (${identity.auth0Sub}, ${identity.email}, ${identity.displayName})
    on conflict (auth0_sub) do update set auth0_sub = excluded.auth0_sub
    returning id, auth0_sub, email, display_name, username, phone, avatar_url, profile_visibility
  `;
  // Existing profile fields are application-owned, not overwritten on sign-in.
  // A duplicate email on another subject fails closed; never auto-link accounts.
  return appUserSchema.parse(rows[0]);
}

export async function hasAdminRole(userId: string) {
  const rows = await getDatabase()`
    select 1 from public.user_roles where user_id = ${userId} and role = 'admin' limit 1
  `;
  return rows.length === 1;
}
