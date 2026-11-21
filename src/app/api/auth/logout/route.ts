import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const tokenHash = request.cookies.get("auth_session_token")?.value;
  if (tokenHash) await revokeSession(tokenHash);

  const response = NextResponse.redirect(new URL("/account/sign-in", request.url), 303);
  response.cookies.set("auth_session_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
