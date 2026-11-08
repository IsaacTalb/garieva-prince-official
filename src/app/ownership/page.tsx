import { PageIntro } from "@/components/shared/page-intro";
import { OwnershipIntro } from "@/components/ownership/ownership-intro";

export const metadata = { title: "Digital ownership" };
export default function OwnershipPage() {
  return <><PageIntro eyebrow="Beyond the garment" title="Your piece. Your story."><p>A new vision for the connection between what you wear and what you own.</p></PageIntro><section className="page-content"><OwnershipIntro /></section></>;
}
