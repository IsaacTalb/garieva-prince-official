import Link from "next/link";
import { Heart } from "lucide-react";

export const metadata = { title: "Wishlist" };
export default function WishlistPage() {
  return <section className="commerce-empty"><Heart size={64} strokeWidth={1.5} aria-hidden="true" /><h1>Your future favorites</h1><p>Saving favorites will be available when the shop opens. Explore the wardrobe in the meantime.</p><Link className="primary-link" href="/products">Explore the shop</Link></section>;
}
