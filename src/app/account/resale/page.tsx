import Image from "next/image";
import Link from "next/link";
import { AccountNavigation } from "@/components/account/account-navigation";
import {
  ResaleListingActions,
  ResaleListingForm,
  ResaleSaleActions,
} from "@/components/resale/resale-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  getEligibleResaleItems,
  getUserResaleListings,
  getUserResaleSales,
} from "@/lib/resale/marketplace";

export const dynamic = "force-dynamic";
export const metadata = { title: "My resale" };

function formatMmk(amount: number) {
  return `${amount.toLocaleString("en-US")} MMK`;
}

export default async function AccountResalePage() {
  const user = await requirePageUser();
  const database = getDatabase();
  const [items, listings, sales] = await Promise.all([
    getEligibleResaleItems(database, user.id, process.env.R2_PUBLIC_BASE_URL),
    getUserResaleListings(database, user.id, process.env.R2_PUBLIC_BASE_URL),
    getUserResaleSales(database, user.id),
  ]);
  const purchases = sales.filter((sale) => sale.buyerUserId === user.id);
  const salesByUser = sales.filter((sale) => sale.sellerUserId === user.id);

  return (
    <>
      <PageIntro eyebrow="Your account" title="My resale">
        <p>List pieces, follow purchases, and manage delivery and payouts.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="resale" />
        <section className="resale-account-section">
          <h2>List a piece</h2>
          <p className="form-hint">
            Only pieces currently in your GP wardrobe, without an active ownership
            transfer, can be listed. GP retains 5%; seller payout is 95% after
            delivery is confirmed. Upload listing photos from your device.
          </p>
          {items.length === 0 ? (
            <div className="content-card">
              <EmptyState
                title="No pieces are ready to list."
                description="Eligible pieces in your wardrobe will appear here."
              />
            </div>
          ) : (
            <div className="account-record-list">
              {items.map((item) => (
                <article
                  className="content-card resale-owner-item"
                  key={item.productItemId}
                >
                  {item.photos[0] ? (
                    <Image
                      alt={`${item.productName} reference`}
                      height={180}
                      src={item.photos[0]}
                      unoptimized
                      width={135}
                    />
                  ) : null}
                  <div>
                    <p className="eyebrow">Serial {item.serialNumber}</p>
                    <h3>{item.productName}</h3>
                    <ResaleListingForm item={item} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="resale-account-section">
          <h2>Your listings</h2>
          {listings.length === 0 ? (
            <div className="content-card">
              <EmptyState
                title="No resale listings yet."
                description="Create a listing above to offer a piece in your wardrobe."
              />
            </div>
          ) : (
            <div className="account-record-list">
              {listings.map((listing) => (
                <article className="content-card resale-record" key={listing.id}>
                  {listing.photos[0] ? (
                    <Image
                      alt={`${listing.productName} resale photo`}
                      height={200}
                      src={listing.photos[0]}
                      unoptimized
                      width={150}
                    />
                  ) : null}
                  <div className="resale-record-copy">
                    <p className="eyebrow">
                      Listing · {listing.status.replaceAll("_", " ")}
                    </p>
                    <h3>{listing.productName}</h3>
                    <p>{formatMmk(listing.price)} · {listing.serialNumber}</p>
                    <ResaleListingActions listing={listing} />
                  </div>
                </article>
              ))}
            </div>
          )}
          <Link className="outline-button" href="/resale">
            View marketplace
          </Link>
        </section>

        <section className="resale-account-section">
          <h2>Your purchases</h2>
          {purchases.length === 0 ? (
            <div className="content-card">
              <EmptyState
                title="No resale purchases yet."
                description="Orders you place in the marketplace will appear here."
              />
            </div>
          ) : (
            <div className="account-record-list">
              {purchases.map((sale) => (
                <article className="content-card resale-record" key={sale.id}>
                  <div className="resale-record-copy">
                    <p className="eyebrow">Order {sale.orderNumber}</p>
                    <h3>{sale.productName}</h3>
                    <p>
                      {formatMmk(sale.amount)} · {sale.status.replaceAll("_", " ")}
                    </p>
                    <dl>
                      <div><dt>Payment status</dt><dd>{sale.paymentStatus}</dd></div>
                      <div><dt>Seller</dt><dd>{sale.sellerName ?? sale.sellerEmail}</dd></div>
                    </dl>
                    <ResaleSaleActions isSeller={false} sale={sale} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="resale-account-section">
          <h2>Your sales</h2>
          {salesByUser.length === 0 ? (
            <div className="content-card">
              <EmptyState
                title="No resale sales yet."
                description="A buyer's order and payment status will appear here."
              />
            </div>
          ) : (
            <div className="account-record-list">
              {salesByUser.map((sale) => (
                <article className="content-card resale-record" key={sale.id}>
                  <div className="resale-record-copy">
                    <p className="eyebrow">Order {sale.orderNumber}</p>
                    <h3>{sale.productName}</h3>
                    <p>
                      Buyer: {sale.buyerName ?? sale.buyerEmail} ·{" "}
                      {sale.status.replaceAll("_", " ")}
                    </p>
                    <dl>
                      <div><dt>Sale price</dt><dd>{formatMmk(sale.amount)}</dd></div>
                      <div><dt>GP fee (5%)</dt><dd>{formatMmk(sale.platformFee)}</dd></div>
                      <div><dt>Your 95%</dt><dd>{formatMmk(sale.sellerAmount)}</dd></div>
                    </dl>
                    <ResaleSaleActions isSeller sale={sale} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
