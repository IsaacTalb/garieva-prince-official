"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand"><Link href="/" className="wordmark">GARIEVA PRINCE</Link><p>Premium fashion. Personal identity.<br />A story that continues beyond the garment.</p></div>
        <div><h2>Quick Links</h2><nav aria-label="Shop links"><Link href="/products">All Products</Link><Link href="/collections">Collections</Link><Link href="/drops">New Drops</Link><Link href="/about">About Us</Link></nav></div>
        <div><h2>Customer Service</h2><nav aria-label="Customer links"><Link href="/account">My Account</Link><Link href="/cart">Shopping Cart</Link><Link href="/wishlist">Wishlist</Link><Link href="/archive-sales">Archive Sales</Link></nav></div>
        <div><h2>Beyond the Garment</h2><nav aria-label="Ownership links"><Link href="/ownership">Digital Ownership</Link><Link href="/resale">Resale</Link></nav><p>Wear your own story.</p></div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Garieva Prince. All rights reserved.</div>
    </footer>
  );
}
