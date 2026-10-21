import { notFound } from "next/navigation";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/client";
import { isDatabaseConfigured } from "@/lib/db/client";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthConfigured() || !isDatabaseConfigured()) return <div className="page-content"><EmptyState title="Operations are unavailable." description="Administrator access is not available at this time." /></div>;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}
