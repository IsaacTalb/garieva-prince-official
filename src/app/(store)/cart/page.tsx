import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export const metadata = { title: "Shopping cart" };
export default function CartPage() {
  return <section className="commerce-empty"><ShoppingBag size={64} strokeWidth={1.5} aria-hidden="true" /><h1>Your cart is waiting</h1><p>Purchasing has not opened yet. Discover Garieva Prince as the first pieces arrive.</p><Link className="primary-link" href="/products">Explore the shop</Link></section>;
}
