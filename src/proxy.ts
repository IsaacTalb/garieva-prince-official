import { NextRequest, NextResponse } from "next/server";
import { getAuth0, isAuthConfigured } from "@/lib/auth/client";

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (request.nextUrl.pathname === "/auth" || request.nextUrl.pathname.startsWith("/auth/")) {
      return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.next();
  }
  return getAuth0().middleware(request);
}

// Broad coverage is required for Auth0's rolling session and callback handling.
// Authorization is enforced again at the page/service boundary.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
