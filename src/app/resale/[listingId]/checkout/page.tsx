import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/shared/page-intro";
import { ResaleCheckoutForm } from "@/components/resale/resale-controls";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/d1/client";
import { getActiveResaleListing } from "@/lib/resale/marketplace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resale checkout" };

function formatMmk(amount: number) {
  return `${amount.toLocaleString("en-US")} MMK`;
}

export default async function ResaleCheckoutPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/sign-in");
  if (!isDatabaseConfigured()) notFound();

  const { listingId } = await params;
  const listing = await getActiveResaleListing(
    getDatabase(),
    listingId,
    process.env.R2_PUBLIC_BASE_URL,
  );
  if (!listing || listing.sellerUserId === user.id) notFound();

  return (
    <>
      <PageIntro eyebrow="Resale marketplace" title="Reserve this piece">
        <p>Your reservation lasts 24 hours while you arrange payment with GP.</p>
      </PageIntro>
      <section className="page-content resale-checkout">
        <article className="content-card resale-checkout-piece">
          {listing.photos[0] ? (
            <Image
              alt={`${listing.productName} resale photo`}
              height={640}
              src={listing.photos[0]}
              unoptimized
              width={480}
            />
          ) : null}
          <p className="eyebrow">Serial {listing.serialNumber}</p>
          <h2>{listing.productName}</h2>
          <p className="resale-price">{formatMmk(listing.price)}</p>
          <p>Condition: {listing.condition.replaceAll("_", " ")}</p>
          <p>{listing.description}</p>
          <p>
            GP fee (5%): {formatMmk(Math.round((listing.price * 5) / 100))}
          </p>
          <p>
            Seller receives (95%): {formatMmk(listing.price - Math.round((listing.price * 5) / 100))}
          </p>
        </article>
        <div className="content-card">
          <h2>Delivery details</h2>
          <p>
            Shipping is arranged and paid separately between you and the seller.
            <a href="mailto:support@garievaprince.com">Contact GP</a> for current
            payment instructions. GP verifies your payment reference manually
            before the seller ships.
          </p>
          <ResaleCheckoutForm
            defaultName={user.display_name ?? ""}
            defaultPhone={user.phone ?? ""}
            listingId={listing.id}
          />
        </div>
      </section>
    </>
  );
}
