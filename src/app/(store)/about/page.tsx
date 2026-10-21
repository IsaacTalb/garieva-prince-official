import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";

export const metadata = { title: "About us" };
export default function AboutPage() {
  return <><PageIntro eyebrow="Garieva Prince" title="Wear your own story."><p>Premium fashion, personal identity, and a connection that goes beyond the garment.</p></PageIntro><section className="page-content"><div className="content-card"><h2>Beyond the physical</h2><p>Garieva Prince is building a wardrobe with a digital story: considered pieces, individual ownership, and a future in which a garment’s history can travel with it.</p><p>Collections and digital ownership services will be introduced as they become available.</p><Link className="primary-link" href="/ownership">Explore digital ownership →</Link></div></section></>;
}
