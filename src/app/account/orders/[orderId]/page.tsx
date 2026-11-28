import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountNavigation } from "@/components/account/account-navigation";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import { getCustomerOrder } from "@/lib/orders/delivery-challan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order details" };

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requirePageUser();
  const { orderId } = await params;
  const order = await getCustomerOrder(getDatabase(), orderId, user.id);
  if (!order) notFound();

  const shipped = ["shipped", "delivered"].includes(order.status);

  return (
    <>
      <PageIntro eyebrow="Your account" title={`Order ${order.orderNumber}`}>
        <p>Review payment, shipment, and delivery-document details.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="orders" />
        <article className="content-card order-detail-card">
          <p className="eyebrow">{shipped ? "Order shipped" : order.status.replaceAll("_", " ")}</p>
          <h2>{order.orderNumber}</h2>
          <dl className="order-detail-facts">
            <div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div>
            <div><dt>Total</dt><dd>{order.totalAmount.toLocaleString("en-US")} MMK</dd></div>
            <div><dt>Courier</dt><dd>{order.courier ?? "Not available"}</dd></div>
            <div><dt>Tracking number</dt><dd>{order.trackingNumber ?? "Not available"}</dd></div>
          </dl>
          {shipped && order.hasDeliveryChallan ? (
            <div className="delivery-challan-customer">
              <h3>Delivery document</h3>
              <Link
                className="primary-link"
                href={`/api/account/orders/${encodeURIComponent(order.id)}/delivery-challan`}
                rel="noreferrer"
                target="_blank"
              >
                View challan
              </Link>
            </div>
          ) : null}
          <Link className="text-link" href="/account/orders">
            Back to order history
          </Link>
        </article>
      </section>
    </>
  );
}
