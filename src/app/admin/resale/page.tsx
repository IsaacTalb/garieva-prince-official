import { ResaleAdminActions } from "@/components/resale/resale-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { isCustomAuthConfigured } from "@/lib/auth/client";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/d1/client";
import { getResaleAdminSales } from "@/lib/resale/marketplace";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resale operations" };

function formatMmk(amount: number) {
  return `${amount.toLocaleString("en-US")} MMK`;
}

export default async function AdminResalePage() {
  if (!isCustomAuthConfigured() || !isDatabaseConfigured()) return null;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }

  const sales = await getResaleAdminSales(getDatabase());

  return (
    <>
      <PageIntro eyebrow="Garieva Prince operations" title="Resale marketplace">
        <p>Verify buyer payments and record seller payouts.</p>
      </PageIntro>
      <section className="page-content">
        {sales.length === 0 ? (
          <div className="content-card">
            <EmptyState
              title="No resale orders."
              description="Orders that need payment review or payout will appear here."
            />
          </div>
        ) : (
          <div className="account-record-list">
            {sales.map((sale) => (
              <article className="content-card resale-admin-record" key={sale.id}>
                <div>
                  <p className="eyebrow">Order {sale.orderNumber}</p>
                  <h2>{sale.productName}</h2>
                  <p>
                    {sale.status.replaceAll("_", " ")} ·{" "}
                    {sale.paymentStatus.replaceAll("_", " ")}
                  </p>
                </div>
                <dl>
                  <div><dt>Buyer</dt><dd>{sale.buyerName ?? sale.buyerEmail}</dd></div>
                  <div><dt>Seller</dt><dd>{sale.sellerName ?? sale.sellerEmail}</dd></div>
                  <div><dt>Buyer reference</dt><dd>{sale.paymentReference ?? "Not submitted"}</dd></div>
                  <div><dt>Sale price</dt><dd>{formatMmk(sale.amount)}</dd></div>
                  <div><dt>GP fee</dt><dd>{formatMmk(sale.platformFee)}</dd></div>
                  <div><dt>Seller payout</dt><dd>{formatMmk(sale.sellerAmount)}</dd></div>
                  <div>
                    <dt>Delivery</dt>
                    <dd>
                      {sale.shippingName} · {sale.shippingPhone} · {sale.shippingAddress}
                    </dd>
                  </div>
                </dl>
                <ResaleAdminActions sale={sale} />
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
