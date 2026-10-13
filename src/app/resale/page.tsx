import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata = { title: "Resale" };
export default function ResalePage() {
  return <><PageIntro eyebrow="A future chapter" title="The story continues."><p>A considered future for pieces that find a new owner.</p></PageIntro><section className="page-content"><EmptyState title="Resale is not open yet." description="Verified ownership transfers and resale will arrive in a later release." /></section></>;
}
