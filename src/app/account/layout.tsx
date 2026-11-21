import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { isCustomAuthConfigured } from "@/lib/auth/client";
import { isDatabaseConfigured } from "@/lib/db/d1/client";

export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: ReactNode }) {
  if (!isCustomAuthConfigured() || !isDatabaseConfigured()) {
    return (
      <section className="page-content">
        <EmptyState
          title="Account access is unavailable."
          description="Sign-in or the account database is not configured for this environment."
        />
      </section>
    );
  }
  return children;
}
