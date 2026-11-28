import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  acceptOwnershipTransfer,
  cancelOwnershipTransfer,
  completeOwnershipTransfer,
  confirmOwnershipTransfer,
  createOwnershipTransfer,
} from "@/lib/ownership/transfers";

const createTransferSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  recipientEmail: z
    .string()
    .trim()
    .max(255)
    .pipe(z.email())
    .transform((email) => email.toLowerCase()),
});

const actionSchema = z.strictObject({
  transferId: z.uuid(),
  action: z.enum(["accept", "confirm", "complete", "cancel"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to transfer ownership." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid transfer request." }, { status: 400 });
  }
  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid recipient email." }, { status: 400 });
  }

  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const created = await createOwnershipTransfer(getDatabase(), {
      publicId: parsed.data.publicId,
      fromUserId: user.id,
      recipientEmail: parsed.data.recipientEmail,
      transferId: crypto.randomUUID(),
      expiresAt,
    });
    if (!created) {
      return Response.json(
        { error: "This recipient or garment is not eligible for a transfer." },
        { status: 409 },
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("ownership_transfers.product_item_id")
    ) {
      return Response.json(
        { error: "A transfer is already in progress for this garment." },
        { status: 409 },
      );
    }
    console.error("Could not initiate ownership transfer:", error);
    return Response.json(
      { error: "The transfer request could not be created." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to manage ownership transfers." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid transfer action." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid transfer action." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const input = {
      transferId: parsed.data.transferId,
      actorUserId: user.id,
    };
    const updated = await (async () => {
      switch (parsed.data.action) {
        case "accept":
          return acceptOwnershipTransfer(database, {
            transferId: input.transferId,
            recipientUserId: user.id,
          });
        case "confirm":
          return confirmOwnershipTransfer(database, {
            transferId: input.transferId,
            fromUserId: user.id,
          });
        case "complete":
          return completeOwnershipTransfer(database, {
            transferId: input.transferId,
            fromUserId: user.id,
            newOwnershipId: crypto.randomUUID(),
          });
        case "cancel":
          return cancelOwnershipTransfer(database, input);
      }
    })();

    if (!updated) {
      return Response.json(
        { error: "This transfer is no longer available for that action." },
        { status: 409 },
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Could not update ownership transfer:", error);
    return Response.json(
      { error: "The transfer could not be updated." },
      { status: 500 },
    );
  }
}
