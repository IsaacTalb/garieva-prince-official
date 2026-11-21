import type { AppUser } from "@/schemas/user";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { AccountNavigation } from "./account-navigation";

export function AccountSummary({ user }: { user: AppUser }) {
  return (
    <>
      <AccountNavigation active="overview" />
      <section className="content-card">
        <div className="profile-summary">
          <span className="profile-avatar">
            <UserRound size={28} aria-hidden="true" />
          </span>
          <div>
            <h2>{user.display_name ?? "Your profile"}</h2>
            <p>{user.profile_visibility === "private" ? "Private profile" : "Public profile"}</p>
          </div>
        </div>
        <dl className="profile-fields">
          <div><dt>Display name</dt><dd>{user.display_name ?? "Not set"}</dd></div>
          <div><dt>Username</dt><dd>{user.username ?? "Not set"}</dd></div>
          <div><dt>Email</dt><dd>{user.email ?? "Not set"}</dd></div>
          <div><dt>Phone</dt><dd>{user.phone ?? "Not set"}</dd></div>
        </dl>
        <div className="account-quick-links">
          <Link href="/account/wardrobe" className="outline-button">View wardrobe</Link>
          <Link href="/account/orders" className="outline-button">View orders</Link>
          <Link href="/account/profile" className="primary-link">Edit profile</Link>
        </div>
        <form action="/api/auth/logout" method="post" className="account-signout">
          <button type="submit" className="outline-button">Sign out</button>
        </form>
      </section>
    </>
  );
}
