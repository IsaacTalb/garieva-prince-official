import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import { createResaleSale } from "@/lib/resale/marketplace";

const checkoutSchema = z.strictObject({
  listingId: z.uuid(),
  shippingName: z.string().trim().min(1).max(150),
  shippingPhone: z.string().trim().min(5).max(30),
  shippingAddress: z.string().trim().min(10).max(1000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to purchase this piece." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid checkout details." }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter complete delivery details." }, { status: 400 });
  }

  try {
    const orderNumber = `GP-R-${crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`;
    const created = await createResaleSale(getDatabase(), {
      saleId: crypto.randomUUID(),
      orderNumber,
      buyerUserId: user.id,
      paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...parsed.data,
    });
    if (!created) {
      return Response.json(
        { error: "This piece has already been reserved or is unavailable." },
        { status: 409 },
      );
    }
    return Response.json({ success: true, orderNumber });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("resale_sales.listing_id")
    ) {
      return Response.json(
        { error: "Another buyer has reserved this piece." },
        { status: 409 },
      );
    }
    console.error("Could not create resale order:", error);
    return Response.json(
      { error: "Checkout could not be completed." },
      { status: 500 },
    );
  }
}
