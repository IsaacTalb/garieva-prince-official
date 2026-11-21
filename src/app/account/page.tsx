import { PageIntro } from "@/components/shared/page-intro";
import { AccountSummary } from "@/components/account/account-summary";
import { requirePageUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageIntro eyebrow="Garieva Prince" title="My Account">
        <p>Your profile, orders, and personal wardrobe.</p>
      </PageIntro>
      <section className="page-content">
        <AccountSummary user={user} />
      </section>
    </>
  );
}
