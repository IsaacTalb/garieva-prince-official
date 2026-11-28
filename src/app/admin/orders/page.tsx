import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { isCustomAuthConfigured } from "@/lib/auth/client";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/d1/client";
import { getAdminOrders } from "@/lib/orders/delivery-challan";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  if (!isCustomAuthConfigured() || !isDatabaseConfigured()) return null;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }

  const orders = await getAdminOrders(getDatabase());

  return (
    <>
      <PageIntro eyebrow="Garieva Prince operations" title="Orders">
        <p>Review order status, courier details, and delivery challans.</p>
      </PageIntro>
      <section className="page-content">
        {orders.length === 0 ? (
          <div className="content-card">
            <EmptyState
              title="No orders yet."
              description="Customer orders will appear here."
            />
          </div>
        ) : (
          <div className="account-record-list">
            {orders.map((order) => (
              <article className="content-card account-record" key={order.id}>
                <div>
                  <p className="eyebrow">Order {order.orderNumber}</p>
                  <h2>{order.status.replaceAll("_", " ")}</h2>
                  <p>{order.customerName} · {order.customerEmail}</p>
                </div>
                <dl>
                  <div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div>
                  <div><dt>Total</dt><dd>{order.totalAmount.toLocaleString("en-US")} MMK</dd></div>
                  <div><dt>Courier</dt><dd>{order.courier ?? "Not entered"}</dd></div>
                  <div><dt>Tracking</dt><dd>{order.trackingNumber ?? "Not entered"}</dd></div>
                  <div><dt>Delivery challan</dt><dd>{order.hasDeliveryChallan ? "Uploaded" : "Not uploaded"}</dd></div>
                </dl>
                <Link
                  className="outline-button"
                  href={`/admin/orders/${encodeURIComponent(order.id)}`}
                >
                  Manage order
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
