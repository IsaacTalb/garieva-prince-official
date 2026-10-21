import type { AppUser } from "@/schemas/user";
import Link from "next/link";
import { UserRound } from "lucide-react";

export function AccountSummary({ user }: { user: AppUser }) {
  return <><nav className="account-tabs" aria-label="Account sections"><span aria-current="page">My Profile</span><Link href="/ownership">Ownership</Link><Link href="/resale">Resale</Link></nav><section className="content-card"><div className="profile-summary"><span className="profile-avatar"><UserRound size={28} aria-hidden="true" /></span><div><h2>{user.display_name ?? "Your profile"}</h2><p>{user.profile_visibility === "private" ? "Private profile" : "Public profile"}</p></div></div><dl className="profile-fields"><div><dt>Display name</dt><dd>{user.display_name ?? "Not set"}</dd></div><div><dt>Username</dt><dd>{user.username ?? "Not set"}</dd></div><div><dt>Email</dt><dd>{user.email ?? "Not set"}</dd></div><div><dt>Phone</dt><dd>{user.phone ?? "Not set"}</dd></div></dl><p>Your wardrobe and ownership records will appear here as these services open. Profile editing is not available yet.</p><a href="/auth/logout" className="outline-button">Sign out →</a></section></>;
}
