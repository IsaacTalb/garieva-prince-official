import { auth } from "@clerk/nextjs/server";

import { getAdminUserIds } from "@/lib/env";

export async function requireAdminUser() {
  const { userId } = await auth();

  if (!userId) {
    return { ok: false as const, status: 401, message: "You must sign in to access admin routes." };
  }

  const adminIds = getAdminUserIds();

  if (adminIds.length > 0 && !adminIds.includes(userId)) {
    return { ok: false as const, status: 403, message: "Your Clerk user is not allowed to manage products." };
  }

  return { ok: true as const, userId };
}
