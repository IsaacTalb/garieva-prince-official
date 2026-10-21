import { notFound } from "next/navigation";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/client";
import { isDatabaseConfigured } from "@/lib/db/client";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";

const sections: Record<string, string> = { categories: "Categories", collections: "Collections", drops: "New Drops", products: "Products", inventory: "Inventory", orders: "Orders", customers: "Customers", payments: "Payments", coupons: "Coupons", settings: "Website Settings", admins: "Admins", users: "Users" };

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = Object.hasOwn(sections, section) ? sections[section] : null;
  if (!title) notFound();
  if (!isAuthConfigured() || !isDatabaseConfigured()) return null;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }
  return <><PageIntro eyebrow="Garieva Prince operations" title={title}><p>Manage the house of Garieva Prince.</p></PageIntro><section className="page-content"><EmptyState title={`${title} management is coming.`} description="This workspace is part of the next release. No changes can be made here yet." /></section></>;
}
