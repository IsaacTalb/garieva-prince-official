import { z } from "zod";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  generateClaimCode,
  invalidateClaimCode,
} from "@/lib/db/d1/ownership_claim_codes";
import { sendOwnershipClaimCodeEmail } from "@/lib/email/brevo";

const issueClaimCodeSchema = z.strictObject({
  orderId: z.string().trim().min(1).max(255),
  productItemId: z.string().trim().min(1).max(255),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    const parsed = issueClaimCodeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid order or item." }, { status: 400 });
    }

    const db = getDatabase();
    const [orderItem] = await db`
      SELECT
        o.customer_email,
        o.customer_name,
        pi.id AS product_item_id,
        pi.serial_number,
        p.name AS product_name,
        pv.size
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_items pi ON pi.id = oi.product_item_id
      JOIN products p ON p.id = pi.product_id
      LEFT JOIN product_variants pv ON pv.id = pi.variant_id
      JOIN payments payment
        ON payment.order_id = o.id AND payment.status = 'approved'
      WHERE o.id = ${parsed.data.orderId}
        AND pi.id = ${parsed.data.productItemId}
        AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
        AND o.payment_status = 'approved'
      LIMIT 1
    `;
    if (!orderItem) {
      return Response.json(
        { error: "No approved order allocation exists for that item." },
        { status: 409 },
      );
    }

    const claim = await generateClaimCode(
      String(orderItem.product_item_id),
      parsed.data.orderId,
    );
    try {
      await sendOwnershipClaimCodeEmail({
        to: [{
          email: String(orderItem.customer_email),
          name: String(orderItem.customer_name),
        }],
        productName: String(orderItem.product_name),
        size: orderItem.size == null ? null : String(orderItem.size),
        serial: String(orderItem.serial_number),
        code: claim.code,
        expiresAt: claim.expires_at,
      });
    } catch (error) {
      await invalidateClaimCode(claim.id);
      throw error;
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: "Administrator access is required." },
        { status: error.status },
      );
    }
    console.error("Could not issue ownership claim code:", error);
    return Response.json(
      { error: "The ownership code could not be issued. Please try again." },
      { status: 500 },
    );
  }
}
