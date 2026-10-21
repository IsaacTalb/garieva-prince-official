import Link from "next/link";
import { BrandSignoff } from "@/components/storefront/brand-signoff";
import { ProductShowcase } from "@/components/storefront/product-showcase";
import { getPublishedProducts } from "@/lib/db/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getPublishedProducts();
  return <><section className="collection-hero" aria-label="Garieva Prince latest collection"><h1 className="sr-only">Garieva Prince</h1><Link href="/collections" className="hero-collection-link">LATEST COLLECTION</Link></section><section className="home-showcase" aria-label="All products"><ProductShowcase products={products} /><BrandSignoff /></section></>;
}
