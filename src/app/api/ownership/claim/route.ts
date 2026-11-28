import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  claimOwnershipAtomically,
  hashOwnershipClaimCode,
} from "@/lib/nfc/claims";

const claimInputSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  code: z.string().trim().min(16).max(80).regex(/^[a-fA-F0-9\s-]+$/),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to claim this piece." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a valid ownership code." }, { status: 400 });
  }

  const parsed = claimInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid ownership code." }, { status: 400 });
  }

  try {
    const codeHash = await hashOwnershipClaimCode(parsed.data.code);
    const claimed = await claimOwnershipAtomically(getDatabase(), {
      publicId: parsed.data.publicId,
      userId: user.id,
      codeHash,
      ownershipId: crypto.randomUUID(),
    });

    if (!claimed) {
      return Response.json(
        { error: "This code is invalid, expired, or the piece is not eligible to claim." },
        { status: 409 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Ownership claim failed:", error);
    return Response.json(
      { error: "The ownership claim could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
