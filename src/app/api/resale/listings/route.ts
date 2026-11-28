import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  createResaleListing,
  publishResaleListing,
  withdrawResaleListing,
} from "@/lib/resale/marketplace";

const createListingSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  price: z.number().int().min(1).max(10_000_000_000),
  condition: z.enum(["new", "like_new", "good", "fair"]),
  description: z.string().trim().min(10).max(2000),
});

const listingActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    listingId: z.uuid(),
    action: z.literal("publish"),
  }),
  z.strictObject({
    listingId: z.uuid(),
    action: z.literal("withdraw"),
  }),
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to list a piece." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid resale listing." }, { status: 400 });
  }
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Check the listing details." }, { status: 400 });
  }

  try {
    const listingId = await createResaleListing(getDatabase(), {
      listingId: crypto.randomUUID(),
      sellerUserId: user.id,
      ...parsed.data,
    });
    if (!listingId) {
      return Response.json(
        { error: "This piece is not eligible to be listed right now." },
        { status: 409 },
      );
    }
    return Response.json({ success: true, listingId });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("resale_listings.product_item_id")
    ) {
      return Response.json(
        { error: "This piece already has an active resale listing." },
        { status: 409 },
      );
    }
    console.error("Could not create resale listing:", error);
    return Response.json(
      { error: "The resale listing could not be created." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to manage your listing." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid listing action." }, { status: 400 });
  }
  const parsed = listingActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid listing action." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const changed = parsed.data.action === "publish"
      ? await publishResaleListing(database, {
          listingId: parsed.data.listingId,
          sellerUserId: user.id,
        })
      : await withdrawResaleListing(database, {
          listingId: parsed.data.listingId,
          sellerUserId: user.id,
        });
    if (!changed) {
      return Response.json(
        { error: "This listing is not available for that action." },
        { status: 409 },
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Could not withdraw resale listing:", error);
    return Response.json(
      { error: "The listing could not be withdrawn." },
      { status: 500 },
    );
  }
}
