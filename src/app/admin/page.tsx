import { PageIntro } from "@/components/shared/page-intro";
import { FoundationStatus } from "@/components/admin/foundation-status";
import { requireAdmin } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/client";
import { isDatabaseConfigured } from "@/lib/db/client";
import { AccessError } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export const metadata = { title: "Operations" };
export default async function AdminPage() {
  // Recheck at the page boundary; layouts are not a substitute for authorization.
  if (!isAuthConfigured() || !isDatabaseConfigured()) return null;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }
  return <><PageIntro eyebrow="Garieva Prince operations" title="The house, behind the scenes."><p>A dedicated space for authorized administrators.</p></PageIntro><section className="page-content"><FoundationStatus /></section></>;
}
