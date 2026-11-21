/**
 * Create Account API - Custom Passwordless Auth (New User After OTP)
 * 
 * Called after successful OTP verification for new users.
 * Creates user record in D1 with optional profile fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAndSetSession } from "@/lib/auth/session";
import { createUser } from "@/lib/db/d1/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      name, 
      username, 
      phone, 
      avatar_url,
      display_name 
    } = body;

    // Email is required (passed via D1 session lookup)
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required", code: "MISSING_EMAIL" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Create user in D1 with optional profile fields
    const result = await createUser({
      email: normalizedEmail,
      name: display_name || name,
      username,
      phone,
      avatar_url,
    });

    // Set session cookie for authenticated user
    const tokenHash = await createAndSetSession({ userId: result.id });

    // Set HttpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: result.id,
        email: result.email,
        display_name: result.display_name,
      },
    });

    // Set HttpOnly cookie with hashed token
    response.headers.set(
      "Set-Cookie",
      `auth_session_token=${tokenHash}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=31536000`
    );

    return response;
  } catch (error) {
    console.error("Create account error:", error);
    
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: "Failed to create account", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}