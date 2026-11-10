import { NextRequest, NextResponse } from "next/server";
import { isCustomAuthConfigured } from "@/lib/auth/client";

export async function proxy(request: NextRequest) {
  // Custom auth is configured (D1 + Brevo OTP) - no Auth0 middleware needed
  if (!isCustomAuthConfigured()) {
    if (request.nextUrl.pathname === "/auth" || request.nextUrl.pathname.startsWith("/auth/")) {
      return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.next();
  }
  // Custom auth handles sessions via D1 - no Auth0 middleware
  return NextResponse.next();
}

// Broad coverage is required for custom auth session handling.
// Authorization is enforced at the page/service boundary (requireUser, requireAdmin).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};