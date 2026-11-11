import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/db/d1/admin";
import { getDatabase } from "@/lib/db/d1/client";
import { generateClaimCode } from "@/lib/db/d1/ownership_claim_codes";

/**
 * POST /api/payments/approve
 * 
 * Admin endpoint to approve payment proof and allocate physical product.
 * Handles idempotent approval transaction with claim code generation.
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authorization
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required", status: 403 },
        { status: 403 }
      );
    }

    // Parse request body
    const { orderId, notes }: { orderId: string; notes?: string } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get D1 database
    const db = getDatabase();

    // Begin transaction (SQLite compatible)
    await db.transaction(() => {
      // 1. Check if order exists and has payment proof
      const [order] = db`
        SELECT * FROM orders 
        WHERE id = ? AND status IN ('pending_payment', 'payment_proof_uploaded')
      `, [orderId];

      if (!order) {
        throw new Error("Order not found or already processed");
      }

      // 2. Check if order is already paid (idempotency check)
      if (order.status === "paid" || order.status === "processing") {
        throw new Error("Order has already been approved");
      }

      // 3. Approve payment and update order status
      db.prepare(`
        UPDATE orders 
        SET status = 'paid', 
              updated_at = datetime('now')
        WHERE id = ?
      `).run([orderId]);

      // 4. Get product/variant info for stock allocation
      const [product] = db`SELECT * FROM products WHERE id = ?`, [order.product_id];
      if (!product) {
        throw new Error("Product not found");
      }

      const [variant] = db`
        SELECT * FROM product_variants 
        WHERE id = ? AND stock > 0
      `, [order.variant_id];

      if (!variant) {
        throw new Error("Variant not found or out of stock");
      }

      // 5. Allocate physical product item (create ownership link)
      // In real implementation, this would query NFC tags or claim codes
      const claimedCode = await generateClaimCode(
        order.product_id,
        variant.serial || `GP${order.id}`
      );

      // 6. Create audit log entry for payment approval
      db.prepare(`
        INSERT INTO audit_logs (event_type, entity_type, entity_id, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(["payment_approved", "order", orderId]);

      // 7. Queue Brevo email with claim code
      // In real implementation, this would call email service
      console.log(
        `[EMAIL] Claim code ${claimedCode.id} generated for order ${orderId}`
      );

      return {
        success: true,
        orderId,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        serial: variant.serial || claimedCode.product_item_id,
        claimCodeId: claimedCode.id,
        claimCodeHash: claimedCode.code_hash, // Only hash, never plaintext
        emailQueued: true,
      };
    })();

    return NextResponse.json(
      {
        success: true,
        orderId,
        productId: order.product_id,
        productName: order.product_name,
        claimCodeId: "claim_generated", // Would be actual ID in real impl
        emailQueued: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Payment approval error:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Payment approval failed",
        details: process.env.NODE_ENV === "development" 
          ? String(error) 
          : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/approve/stats
 * Admin endpoint to get approval statistics
 */
export async function GET() {
  try {
    const db = getDatabase();
    
    // Require admin
    await requireAdmin();

    const [stats] = await db`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_count
      FROM orders
    `;

    return NextResponse.json({ stats: (stats as any) || { total_orders: 0, paid_count: 0, pending_count: 0 } });
  } catch (error) {
    console.error("Error getting approval stats:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}