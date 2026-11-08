import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Collections" };
export default function CollectionsPage() {
  return <><PageIntro eyebrow="The house" title="A collection of intentions."><p>Distinct chapters in the Garieva Prince wardrobe.</p></PageIntro><section className="page-content"><EmptyState title="Collections are coming." description="The first chapter will appear here when it is ready." /></section></>;
}
