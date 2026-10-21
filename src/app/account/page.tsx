import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";
import { AccountSummary } from "@/components/account/account-summary";
import { isAuthConfigured } from "@/lib/auth/client";
import { isDatabaseConfigured } from "@/lib/db/client";
import { requirePageUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };

export default async function AccountPage() {
  if (!isAuthConfigured() || !isDatabaseConfigured()) return <div className="page-content"><EmptyState title="Account access is coming." description="Sign-in is temporarily unavailable. Please return soon." /></div>;
  const user = await requirePageUser();
  return <><PageIntro eyebrow="Garieva Prince" title="My Account"><p>Your profile and your personal wardrobe.</p></PageIntro><section className="page-content"><AccountSummary user={user} /></section></>;
}
