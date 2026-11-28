import { z } from "zod";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  approveResalePayment,
  markResalePayoutPaid,
  rejectResalePayment,
} from "@/lib/resale/marketplace";
import { sendOtpEmail } from "@/lib/email/brevo";

const actionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("approve_payment"),
  }),
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("reject_payment"),
    notes: z.string().trim().min(3).max(500),
  }),
  z.strictObject({
    saleId: z.uuid(),
    action: z.literal("mark_payout_paid"),
    payoutReference: z.string().trim().min(3).max(160),
  }),
]);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function PATCH(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid resale administration action." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid resale administration action." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const { saleId, action } = parsed.data;
    let changed = false;
    if (action === "approve_payment") {
      changed = await approveResalePayment(database, {
        saleId,
        adminUserId: admin.id,
      });
    } else if (action === "reject_payment") {
      changed = await rejectResalePayment(database, {
        saleId,
        adminUserId: admin.id,
        notes: parsed.data.notes,
      });
    } else {
      changed = await markResalePayoutPaid(database, {
        saleId,
        adminUserId: admin.id,
        payoutReference: parsed.data.payoutReference,
      });
    }
    if (!changed) {
      return Response.json(
        { error: "This resale order is not available for that action." },
        { status: 409 },
      );
    }

    if (action !== "approve_payment") {
      return Response.json({ success: true });
    }

    let sellerNotified = false;
    try {
      const [seller] = await database`
        SELECT sale.order_number, sale.seller_amount, seller.email,
               COALESCE(NULLIF(trim(seller.name), ''), seller.username) AS name,
               product.name AS product_name
        FROM resale_sales sale
        JOIN users seller ON seller.id = sale.seller_user_id
        JOIN resale_listings listing ON listing.id = sale.listing_id
        JOIN product_items pi ON pi.id = listing.product_item_id
        JOIN products product ON product.id = pi.product_id
        WHERE sale.id = ${saleId}
          AND sale.status = 'paid'
          AND sale.payment_status = 'approved'
      `;
      if (!seller) {
        throw new Error("Approved resale order was not found for seller notification.");
      }
      const sellerName = String(seller.name ?? "there");
      const productName = String(seller.product_name);
      const orderNumber = String(seller.order_number);
      const amount = Number(seller.seller_amount).toLocaleString("en-US");
      await sendOtpEmail({
        to: [{ email: String(seller.email), name: sellerName }],
        subject: "Your Garieva Prince resale is ready to ship",
        htmlContent: `<p>Hello ${escapeHtml(sellerName)},</p><p>Payment for your resale order ${escapeHtml(orderNumber)} has been approved. Please sign in to your account to view the delivery details and shipping steps for ${escapeHtml(productName)}.</p><p>Your payout amount after the 5% GP fee will be ${escapeHtml(amount)} MMK, released after delivery is confirmed and ownership has transferred.</p>`,
        textContent: `Hello ${sellerName}, payment for resale order ${orderNumber} has been approved. Sign in to your account to view delivery details and shipping steps for ${productName}. Your payout amount after the 5% GP fee will be ${amount} MMK, released after delivery is confirmed and ownership has transferred.`,
      });
      sellerNotified = true;
    } catch (error) {
      console.error("Resale payment was approved but seller notification failed:", error);
    }

    return Response.json({ success: true, sellerNotified });
  } catch (error) {
    console.error("Could not administer resale order:", error);
    return Response.json(
      { error: "The resale order could not be updated." },
      { status: 500 },
    );
  }
}
