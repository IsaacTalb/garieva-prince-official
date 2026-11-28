import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  getCurrentDeliveryChallan,
  getCustomerOrder,
} from "@/lib/orders/delivery-challan";
import { createPrivateMediaRead } from "@/lib/r2/media";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to view this document." }, { status: 401 });
  }

  const { orderId } = await params;
  try {
    const database = getDatabase();
    const order = await getCustomerOrder(database, orderId, user.id);
    if (!order || !["shipped", "delivered"].includes(order.status)) {
      return Response.json({ error: "Delivery challan not found." }, { status: 404 });
    }

    const document = await getCurrentDeliveryChallan(database, order.id);
    if (!document) {
      return Response.json({ error: "Delivery challan not found." }, { status: 404 });
    }

    const url = await createPrivateMediaRead(document.objectKey);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not authorize delivery challan read:", error);
    return Response.json(
      { error: "The private delivery document could not be opened." },
      { status: 500 },
    );
  }
}
