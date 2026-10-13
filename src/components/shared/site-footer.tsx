import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><p className="wordmark">GARIEVA PRINCE</p><p>Made to be worn. A story to be kept.</p></div>
      <nav aria-label="Footer navigation"><Link href="/drops">Drops</Link><Link href="/archive-sales">Archive</Link><Link href="/resale">Resale</Link></nav>
      <small>© {new Date().getFullYear()} Garieva Prince</small>
    </footer>
  );
}
