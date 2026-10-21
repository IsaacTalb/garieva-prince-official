import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";

export const metadata = { title: "Checkout" };
export default function CheckoutPage() {
  return <><PageIntro eyebrow="Garieva Prince" title="Checkout"><p>Purchasing and payment submission are not available yet.</p></PageIntro><section className="page-content checkout-grid"><div className="content-card"><ShoppingBag size={36} aria-hidden="true" /><h2 style={{ marginTop: 20 }}>Your next chapter starts here</h2><p>When the shop opens, your selected pieces and delivery details will appear here.</p><Link className="outline-button" href="/products">← Back to shop</Link></div><aside className="content-card checkout-summary"><h2>Order summary</h2><p>No order has been created. Payment details will be available when checkout opens.</p><button className="primary-link" disabled>Checkout unavailable</button></aside></section></>;
}
