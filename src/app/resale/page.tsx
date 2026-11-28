import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/d1/client";
import { getActiveResaleListings } from "@/lib/resale/marketplace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resale marketplace" };

function formatMmk(amount: number) {
  return `${amount.toLocaleString("en-US")} MMK`;
}

export default async function ResalePage() {
  const listings = isDatabaseConfigured()
    ? await getActiveResaleListings(
        getDatabase(),
        process.env.R2_PUBLIC_BASE_URL,
      )
    : [];

  return (
    <>
      <PageIntro eyebrow="The GP wardrobe, continued" title="Resale">
        <p>Find a pre-loved Garieva Prince piece and give it a new chapter.</p>
      </PageIntro>
      <section className="page-content">
        <div className="resale-policy content-card">
          <h2>Considered resale, verified ownership</h2>
          <p>
            Payments are verified manually by GP.{" "}
            <a href="mailto:support@garievaprince.com">Contact GP</a> for current
            payment instructions before sending money. Buyer and seller arrange shipping
            separately; ownership transfers after the buyer confirms delivery.
          </p>
        </div>
        {listings.length === 0 ? (
          <div className="content-card">
            <EmptyState
              title="No pieces listed right now."
              description="Check back soon, or sign in to list a piece from your wardrobe."
            />
          </div>
        ) : (
          <div className="resale-grid">
            {listings.map((listing) => (
              <article className="content-card resale-card" key={listing.id}>
                {listing.photos[0] ? (
                  <Image
                    alt={`${listing.productName} resale photo`}
                    className="resale-card-image"
                    height={640}
                    src={listing.photos[0]}
                    unoptimized
                    width={480}
                  />
                ) : (
                  <div className="resale-card-image resale-image-empty">
                    Photo unavailable
                  </div>
                )}
                <div className="resale-card-copy">
                  <p className="eyebrow">Verified GP piece · {listing.serialNumber}</p>
                  <h2>{listing.productName}</h2>
                  <p className="resale-price">{formatMmk(listing.price)}</p>
                  <p>
                    Condition: {listing.condition.replaceAll("_", " ")}
                  </p>
                  <p>{listing.description}</p>
                  <Link
                    className="primary-link"
                    href={`/resale/${encodeURIComponent(listing.id)}/checkout`}
                  >
                    Reserve this piece
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
