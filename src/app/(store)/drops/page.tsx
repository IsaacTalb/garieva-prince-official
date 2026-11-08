import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Drops" };
export default function DropsPage() {
  return <><PageIntro eyebrow="New releases" title="Worth waiting for."><p>The next Garieva Prince releases, in their own time.</p></PageIntro><section className="page-content"><EmptyState title="No drops announced." description="Release dates will be shared here once confirmed." /></section></>;
}
