import type { AppUser } from "@/schemas/user";

export function AccountSummary({ user }: { user: AppUser }) {
  return <section className="content-card"><h2>{user.display_name ?? "Your profile"}</h2><p>Your profile is {user.profile_visibility}. Your wardrobe and ownership records will appear here as these services open.</p><a href="/auth/logout" className="text-link">Sign out →</a></section>;
}
