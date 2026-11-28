import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  cancelResaleSale,
  confirmResaleDelivery,
  shipResaleSale,
  submitResalePaymentReference,
} from "@/lib/resale/marketplace";

const actionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("submit_payment"),
    reference: z.string().trim().min(3).max(160),
  }),
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("cancel"),
  }),
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("ship"),
    trackingNumber: z.string().trim().min(2).max(100),
  }),
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("confirm_delivery"),
  }),
]);

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to manage resale orders." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid resale order action." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid resale order action." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const { saleId, action } = parsed.data;
    const changed = await (async () => {
      switch (action) {
        case "submit_payment":
          return submitResalePaymentReference(database, {
            saleId,
            buyerUserId: user.id,
            reference: parsed.data.reference,
          });
        case "cancel":
          return cancelResaleSale(database, {
            saleId,
            buyerUserId: user.id,
          });
        case "ship":
          return shipResaleSale(database, {
            saleId,
            sellerUserId: user.id,
            trackingNumber: parsed.data.trackingNumber,
          });
        case "confirm_delivery":
          return confirmResaleDelivery(database, {
            saleId,
            buyerUserId: user.id,
            newOwnershipId: crypto.randomUUID(),
          });
      }
    })();

    if (!changed) {
      return Response.json(
        { error: "This order is not available for that action." },
        { status: 409 },
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Could not update resale order:", error);
    return Response.json(
      { error: "The resale order could not be updated." },
      { status: 500 },
    );
  }
}
