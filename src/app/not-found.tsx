import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";

export default function NotFound() {
  return <PageIntro eyebrow="404" title="A page out of place."><p>We could not find that page.</p><Link className="text-link" href="/">Return to the house →</Link></PageIntro>;
}
