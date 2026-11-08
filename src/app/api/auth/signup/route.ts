/**
 * Sign Up API - Custom Passwordless Auth (New User)
 * 
 * Flow:
 * 1. POST /api/auth/signup with email
 * 2. Create OTP record in D1, send via Brevo
 * 3. Client receives confirmation, enters OTP
 * 4. POST to verify OTP -> create user + session
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // Normalize email for storage
    const normalizedEmail = email.trim().toLowerCase();
    
    if (normalizedEmail.length < 3 || normalizedEmail.length > 255) {
      return NextResponse.json(
        { error: "Invalid email address", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // Create OTP record in D1
    const otpRecord = await import("@/lib/auth/otp").then(m => m.createOtpRecord({
      email: normalizedEmail,
      purpose: "sign_up",
    }));

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Failed to send verification code", code: "OTP_ERROR" },
        { status: 500 }
      );
    }

    // Set cookie with OTP ID for debugging (not the actual code)
    const response = NextResponse.json({ 
      success: true,
      message: "Verification code sent. Check your email.",
    });

    // Set HttpOnly cookie for session token placeholder
    response.headers.set(
      "Set-Cookie",
      `auth_session_token_placeholder=not_set_yet; Path=/; HttpOnly; SameSite=Lax; Secure`
    );

    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: "Failed to send verification code", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Re-send OTP for new user
 */
export async function POSTResend(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email required", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    // Wait a bit between OTPs to prevent spam
    await new Promise(resolve => setTimeout(resolve, 1000));

    const otpRecord = await import("@/lib/auth/otp").then(m => m.resendOtp({
      email: email.trim().toLowerCase(),
      purpose: "sign_up",
    }));

    return NextResponse.json({
      success: true,
      message: "New verification code sent.",
      otpId: otpRecord.id,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    
    return NextResponse.json(
      { error: "Failed to resend verification code", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Get OTP status (for debugging/admin)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const otpStatus = await import("@/lib/auth/otp").then(m => m.getOtpStatus(email));

    if (!otpStatus) {
      return NextResponse.json(
        { success: true, message: "No active OTP found" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      email: otpStatus.email,
      purpose: otpStatus.purpose,
      expiresAt: otpStatus.expires_at,
      attemptCount: otpStatus.attempt_count,
    });
  } catch (error) {
    console.error("Get OTP status error:", error);
    
    return NextResponse.json(
      { error: "Failed to get OTP status", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}