import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getPublishedProductBySlug } from "@/lib/db/catalog";
import { slugSchema } from "@/schemas/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();
  return <section className="page-content"><Link className="text-link" href="/products">← Back to shop</Link><div className="product-detail" style={{ marginTop: 32 }}><div>{product.image_url ? <Image className="product-image" src={product.image_url} alt={product.image_alt ?? product.name} width={640} height={640} unoptimized /> : <div className="product-image-missing"><ShoppingBag size={64} strokeWidth={1} /><span>Product photography is coming.</span></div>}</div><div><p className="eyebrow">Garieva Prince</p><h1>{product.name}</h1><p>{product.description}</p><div className="content-card"><p>Purchasing is not available yet. Options and availability will appear when the shop opens.</p><button className="primary-link" disabled>Coming soon</button></div></div></div></section>;
}
