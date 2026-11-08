import "server-only";
import { cache } from "react";
import { getDatabase } from "@/lib/db/d1/client";
import { validateSessionToken, createSession, revokeSession } from "@/lib/auth/session";

let cachedClient: Auth0Client | undefined;

/**
 * Check if Auth0 is configured (transitional auth provider)
 */
export function isAuthConfigured() {
  return !!process.env.AUTH0_DOMAIN && !!process.env.AUTH0_CLIENT_ID && !!process.env.AUTH0_CLIENT_SECRET;
}

/**
 * Get Auth0 client for transitional authentication
 * 
 * This is DEPRECATED and will be removed once D1/custom-auth is fully implemented.
 * Current usage: maintaining existing sessions until migration is complete.
 */
export function getAuth0() {
  if (cachedClient) return cachedClient;
  
  // Only initialize if Auth0 is configured
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET) {
    return null;
  }
  
  try {
    const jose = require("jose");
    const { secretToKey } = jose.webcrypto.key;
    
    cachedClient = new (require("@auth0/nextjs-auth0").Auth0Client)({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SECRET, // Required for token encryption
      appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
      authorizationParameters: { scope: "openid profile email" },
      enableAccessTokenEndpoint: false,
    });
    
    return cachedClient;
  } catch {
    return null;
  }
}

/**
 * Clear Auth0 client cache (for testing)
 */
export function clearAuth0Cache() {
  cachedClient = undefined;
}

/**
 * Get user from session using D1-backed sessions (preferred method)
 * 
 * This is the primary authentication method once D1 is bound.
 * Sessions are stored as opaque tokens in the sessions table.
 */
export async function getD1Session(): Promise<SessionData | null> {
  // Session token comes from HttpOnly cookie
  const token = process.env.AUTH_SESSION_TOKEN; // Set by cookie in production
  
  if (!token) return null;
  
  try {
    const db = getDatabase();
    await validateSessionToken(token);
    
    const [session] = await db`SELECT user_id FROM sessions WHERE token_hash = ${token} AND revoked_at IS NULL LIMIT 1`;
    
    if (!session?.user_id) return null;
    
    // Get user data
    try {
      const rows = await db`SELECT id, email, display_name FROM users WHERE id = ${session.user_id} LIMIT 1`;
      if (rows[0]) {
        return {
          id: rows[0].id,
          email: rows[0].email,
          display_name: rows[0].display_name ?? undefined,
        };
      }
    } catch {
      // User may have been deleted - invalidate session
      await revokeSession(token);
    }
    
    return null;
  } catch {
    // Invalid or expired session
    return null;
  }
}

type SessionData = {
  id: string;
  email: string;
  display_name?: string | null;
};