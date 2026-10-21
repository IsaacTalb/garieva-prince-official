"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingCart, UserRound, X } from "lucide-react";

const links = [
  { href: "/collections", label: "COLLECTIONS" },
  { href: "/archive-sales", label: "ARCHIVE SALES" },
  { href: "/about", label: "ABOUT US" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const mobile = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    mobile.current?.close();
    setMenuOpen(false);
  }

  function openSearch() {
    search.current?.showModal();
    searchInput.current?.focus();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <>
      <header className={`site-header ${pathname === "/" ? "header-over-hero" : ""}`}>
        <div className="header-glass">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => { mobile.current?.showModal(); setMenuOpen(true); }}><Menu size={20} /></button>
          <nav className="desktop-nav" aria-label="Main navigation">
            <details className="shop-menu"><summary>SHOP <ChevronDown size={14} /></summary><div className="shop-dropdown"><Link href="/products" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>SHOP ALL</Link><Link href="/drops" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>NEW DROPS</Link></div></details>
            {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
          </nav>
          <Link href="/" className="wordmark header-wordmark" aria-label="Garieva Prince home">GARIEVA PRINCE</Link>
          <div className="header-actions">
            <button className="icon-button desktop-search-button" aria-label="Search products" onClick={openSearch}><Search size={20} /></button>
            <Link href="/account" className="header-account">ACCOUNT</Link>
            <Link href="/wishlist" className="icon-button" aria-label="Wishlist"><Heart size={20} /></Link>
            <Link href="/cart" className="icon-button" aria-label="Shopping cart"><ShoppingCart size={20} /></Link>
          </div>
        </div>
      </header>

      <dialog ref={mobile} id="mobile-navigation" className="mobile-navigation" aria-label="Navigation menu" onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="mobile-dialog-body">
          <div className="dialog-top"><span className="wordmark">GARIEVA PRINCE</span><button className="icon-button" aria-label="Close navigation menu" onClick={closeMenu}><X size={20} /></button></div>
          <form action="/products" className="search-form" onSubmit={closeMenu}><Search size={18} /><input name="search" aria-label="Search products" placeholder="Search products…" maxLength={120} /><button className="icon-button" aria-label="Submit product search"><Search size={18} /></button></form>
          <nav className="mobile-links" aria-label="Mobile navigation">
            <details><summary>SHOP <ChevronDown size={16} /></summary><div><Link href="/products" onClick={closeMenu}>SHOP ALL</Link><Link href="/drops" onClick={closeMenu}>NEW DROPS</Link></div></details>
            {links.map((link) => <Link href={link.href} key={link.href} onClick={closeMenu} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
            <Link href="/ownership" onClick={closeMenu}>DIGITAL OWNERSHIP</Link>
          </nav>
          <div className="mobile-account-links"><Link className="outline-button" href="/account" onClick={closeMenu}><UserRound size={16} /> ACCOUNT</Link><Link className="primary-link" href="/products" onClick={closeMenu}>SHOP ALL</Link></div>
        </div>
      </dialog>

      <dialog ref={search} className="search-dialog" aria-labelledby="search-title" onClick={(event) => { if (event.target === event.currentTarget) search.current?.close(); }}>
        <div className="dialog-top"><h2 id="search-title">Find your next piece</h2><button className="icon-button" aria-label="Close search" onClick={() => search.current?.close()}><X size={20} /></button></div>
        <form action="/products" className="search-form" onSubmit={() => search.current?.close()}><Search size={18} /><input ref={searchInput} name="search" aria-label="Search products" placeholder="Search products…" maxLength={120} required /><button className="icon-button" aria-label="Submit product search"><Search size={18} /></button></form>
      </dialog>
    </>
  );
}
