import { AccountNavigation } from "@/components/account/account-navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getUserOrders } from "@/lib/db/d1/orders";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders" };

export default async function AccountOrdersPage() {
  const user = await requirePageUser();
  const { rows: orders } = await getUserOrders(user.id);

  return (
    <>
      <PageIntro eyebrow="Your account" title="Order history">
        <p>Review the order and payment status of your purchases.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="orders" />
        {orders.length === 0 ? (
          <div className="content-card">
            <EmptyState
              title="No orders yet."
              description="Orders connected to your account will appear here."
            />
          </div>
        ) : (
          <div className="account-record-list">
            {orders.map((order) => (
              <article className="content-card account-record" key={order.id}>
                <div>
                  <p className="eyebrow">Order {order.order_number}</p>
                  <h2>{order.status}</h2>
                  <p>Placed {order.created_at}</p>
                </div>
                <dl>
                  <div><dt>Payment</dt><dd>{order.payment_status}</dd></div>
                  <div><dt>Total</dt><dd>{order.total_amount.toLocaleString()}</dd></div>
                  <div>
                    <dt>Tracking</dt>
                    <dd>{order.tracking_number ?? "Not available"}</dd>
                  </div>
                </dl>
                <Link
                  className="outline-button"
                  href={`/account/orders/${encodeURIComponent(order.id)}`}
                >
                  View order
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
