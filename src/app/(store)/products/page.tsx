import type { Metadata } from "next";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";
import { getPublishedProducts } from "@/lib/db/catalog";

export const metadata: Metadata = { title: "The wardrobe" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  return <><PageIntro eyebrow="The wardrobe" title="Considered pieces."><p>The Garieva Prince catalog. Discover each piece as it joins the house.</p></PageIntro><section className="page-content" aria-label="Catalog">{products.length ? <div className="catalog-grid">{products.map((product) => <article className="content-card" key={product.id}><h2>{product.name}</h2><p>{product.description}</p></article>)}</div> : <EmptyState title="The next chapter is taking shape." description="No pieces are available to browse yet. Return here for the first collection." />}</section></>;
}
