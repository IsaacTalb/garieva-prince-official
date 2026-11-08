import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { PublicProduct } from "@/schemas/catalog";

export function ProductShowcase({ products, search }: { products: PublicProduct[]; search?: string }) {
  if (!products.length) return <div className="showcase-empty"><div className="liquid-glass empty-product-card"><ShoppingCart size={48} strokeWidth={1.5} aria-hidden="true" /><h2>{search ? "No matching pieces" : "The wardrobe is coming"}</h2><p>{search ? `No pieces match “${search}”. Try another search.` : "New Garieva Prince pieces will appear here."}</p>{search && <Link className="text-link" href="/products">View all products →</Link>}</div></div>;
  return <div className="floating-products" aria-label="Garieva Prince products">{products.map((product, index) => <article className={`floating-product float-position-${index % 5}`} key={product.id}>
    <Link href={`/products/${product.slug}`} className="product-visual" aria-label={`View ${product.name}`}>
      {product.image_url ? <Image src={product.image_url} alt={product.image_alt ?? product.name} width={320} height={320} unoptimized className="product-image" /> : <div className="product-image-missing"><ShoppingCart size={40} strokeWidth={1} aria-hidden="true" /><span>{product.name}</span></div>}
      <span className="product-caption">{product.name}</span>
    </Link>
  </article>)}</div>;
}
