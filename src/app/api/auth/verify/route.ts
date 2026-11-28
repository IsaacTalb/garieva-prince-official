/**
 * OTP Verification API - Custom Passwordless Auth
 * 
 * Flow:
 * 1. Client enters OTP in frontend form
 * 2. POST /api/auth/verify with { code, purpose }
 * 3. Verify OTP hash in D1
 * 4. Create session token and store in D1
 * 5. Set HttpOnly cookie with hashed token
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, purpose } = body;

    // Validate OTP format (6 digits)
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your email." },
        { status: 400 }
      );
    }

    // Validate purpose
    if (!purpose || !["sign_in", "sign_up"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Verify OTP and get user ID from D1
    const { verifyOtp } = await import("@/lib/auth/otp");
    const { getUserByEmail } = await import("@/lib/db/d1/users");
    
    const result = await verifyOtp({ purpose, code });
    
    if (!result.verified) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    // Get or create user in D1
    let existingUser = await getUserByEmail(result.email);
    if (!existingUser && purpose === "sign_up") {
      const { createUser } = await import("@/lib/db/d1/users");
      existingUser = await createUser({ email: result.email });
    }
    const userId = existingUser?.id;

    // Create session token
    const { createAndSetSession } = await import("@/lib/auth/session");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const tokenHash = await createAndSetSession({ userId });

    // Set HttpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth_session_token", tokenHash, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    
    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
