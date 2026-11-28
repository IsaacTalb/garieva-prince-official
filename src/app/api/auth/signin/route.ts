/**
 * Sign In API - Custom Passwordless Auth
 * 
 * Flow:
 * 1. POST /api/auth/signin with email
 * 2. Verify user exists in D1
 * 3. Create OTP record in D1, send via Brevo
 * 4. Client receives confirmation, enters OTP
 * 5. POST to verify OTP -> create session
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
      purpose: "sign_in",
    }));

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Failed to send verification code", code: "OTP_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent. Check your email.",
    });
  } catch (error) {
    console.error("Sign in error:", error);
    
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: "Failed to send verification code", code: "INTERNAL_ERROR" },
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
      expiresAt: otpStatus.expiresAt,
      attemptCount: otpStatus.attemptCount,
    });
  } catch (error) {
    console.error("Get OTP status error:", error);
    
    return NextResponse.json(
      { error: "Failed to get OTP status", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}