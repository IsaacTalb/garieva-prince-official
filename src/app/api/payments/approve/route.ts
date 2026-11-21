import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase, transaction } from "@/lib/db/d1/client";
import { generateClaimCode } from "@/lib/db/d1/ownership_claim_codes";

type DatabaseRow = Record<string, unknown>;

function queryFirst(
  database: ReturnType<typeof getDatabase>,
  query: string,
  params: unknown[] = []
): DatabaseRow | null {
  const statement = database.prepare(query);
  try {
    statement.bind(params);
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
}

function execute(
  database: ReturnType<typeof getDatabase>,
  query: string,
  params: unknown[] = []
): number {
  const statement = database.prepare(query);
  try {
    statement.run(params);
    return database.getRowsModified();
  } finally {
    statement.free();
  }
}

/**
 * POST /api/payments/approve
 * Approve payment proof and allocate a claim code to the order.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const orderId =
      typeof body === "object" && body !== null && "orderId" in body
        ? body.orderId
        : undefined;

    if (typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const database = getDatabase();
    const approval = await transaction(async () => {
      const order = queryFirst(
        database,
        "SELECT id, status, product_id, product_name, variant_id FROM orders WHERE id = ? AND status IN (?, ?)",
        [orderId, "pending_payment", "payment_proof_uploaded"]
      );

      if (!order) {
        throw new Error("Order not found or already processed");
      }

      const product = queryFirst(database, "SELECT id, name FROM products WHERE id = ?", [
        order.product_id,
      ]);
      if (!product) {
        throw new Error("Product not found");
      }

      const variant = queryFirst(
        database,
        "SELECT id, sku AS serial FROM product_variants WHERE id = ? AND stock > 0",
        [order.variant_id]
      );
      if (!variant) {
        throw new Error("Variant not found or out of stock");
      }

      const changed = execute(
        database,
        "UPDATE orders SET status = ? WHERE id = ? AND status IN (?, ?)",
        ["paid", orderId, "pending_payment", "payment_proof_uploaded"]
      );
      if (changed !== 1) {
        throw new Error("Order has already been approved");
      }

      const serial = String(variant.serial || `GP${order.id}`);
      const claimedCode = await generateClaimCode(
        String(order.product_id),
        serial
      );

      execute(
        database,
        "INSERT INTO audit_logs (event_type, entity_type, entity_id, created_at) VALUES (?, ?, ?, datetime('now'))",
        ["payment_approved", "order", orderId]
      );

      return {
        orderId,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        claimCodeId: claimedCode.id,
        emailQueued: false,
      };
    });

    return NextResponse.json({ success: true, ...approval }, { status: 200 });
  } catch (error) {
    console.error("Payment approval error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Payment approval failed",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/approve/stats
 * Admin endpoint to get approval statistics.
 */
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const database = getDatabase();
    const stats =
      queryFirst(
        database,
        "SELECT COUNT(*) AS total_orders, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pending_count FROM orders",
        ["paid", "pending_payment"]
      ) ?? { total_orders: 0, paid_count: 0, pending_count: 0 };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error getting approval stats:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
