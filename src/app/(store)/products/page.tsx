import type { Metadata } from "next";
import { PageIntro } from "@/components/shared/page-intro";
import { ProductShowcase } from "@/components/storefront/product-showcase";
import { BrandSignoff } from "@/components/storefront/brand-signoff";
import { Search } from "lucide-react";
import { getPublishedProducts } from "@/lib/db/catalog";

export const metadata: Metadata = { title: "The wardrobe" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 120) : "";
  const products = await getPublishedProducts(search);
  return <><PageIntro eyebrow="Garieva Prince" title={search ? "Search results" : "Shop all"}><form action="/products" className="search-form catalog-search"><Search size={18} /><input name="search" aria-label="Search products" defaultValue={search} placeholder="Search products…" maxLength={120} /><button className="icon-button" aria-label="Submit product search"><Search size={18} /></button></form></PageIntro><section className="home-showcase" aria-label="Catalog"><ProductShowcase products={products} search={search} /><BrandSignoff /></section></>;
}
