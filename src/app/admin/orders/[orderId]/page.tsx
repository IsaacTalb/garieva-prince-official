import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryChallanAdmin } from "@/components/orders/delivery-challan-admin";
import { PageIntro } from "@/components/shared/page-intro";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { isCustomAuthConfigured } from "@/lib/auth/client";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/d1/client";
import { getAdminOrder } from "@/lib/orders/delivery-challan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage order" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  if (!isCustomAuthConfigured() || !isDatabaseConfigured()) return null;
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }

  const { orderId } = await params;
  const order = await getAdminOrder(getDatabase(), orderId);
  if (!order) notFound();

  const canShip =
    order.paymentStatus === "approved" &&
    ["paid", "processing", "shipped"].includes(order.status);

  return (
    <>
      <PageIntro eyebrow="Order operations" title={`Order ${order.orderNumber}`}>
        <p>Update courier and tracking information and securely attach the delivery challan.</p>
      </PageIntro>
      <section className="page-content order-detail-layout">
        <article className="content-card">
          <p className="eyebrow">{order.status.replaceAll("_", " ")}</p>
          <h2>{order.customerName}</h2>
          <dl className="order-detail-facts">
            <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>
            <div><dt>Phone</dt><dd>{order.customerPhone}</dd></div>
            <div><dt>Payment status</dt><dd>{order.paymentStatus}</dd></div>
            <div><dt>Total</dt><dd>{order.totalAmount.toLocaleString("en-US")} MMK</dd></div>
            <div><dt>Courier</dt><dd>{order.courier ?? "Not entered"}</dd></div>
            <div><dt>Tracking number</dt><dd>{order.trackingNumber ?? "Not entered"}</dd></div>
          </dl>
        </article>
        <DeliveryChallanAdmin
          canShip={canShip}
          courier={order.courier}
          document={order.deliveryChallan}
          orderId={order.id}
          trackingNumber={order.trackingNumber}
        />
        <Link className="text-link" href="/admin/orders">
          Back to orders
        </Link>
      </section>
    </>
  );
}
