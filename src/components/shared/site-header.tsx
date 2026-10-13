import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Garieva Prince home">GARIEVA <span>PRINCE</span></Link>
      <nav aria-label="Main navigation">
        <Link href="/products">The wardrobe</Link>
        <Link href="/collections">Collections</Link>
        <Link href="/ownership">Ownership</Link>
        <Link href="/account" className="account-link">Account <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}
