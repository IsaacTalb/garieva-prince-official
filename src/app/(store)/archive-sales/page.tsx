import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Archive" };
export default function ArchivePage() {
  return <><PageIntro eyebrow="The archive" title="Another moment to wear."><p>Past chapters, revisited with intention.</p></PageIntro><section className="page-content"><EmptyState title="The archive is closed." description="Archive sales are not available yet." /></section></>;
}
