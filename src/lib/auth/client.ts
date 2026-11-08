import "server-only";
import { getDatabase } from "@/lib/db/d1/client";
import { createSession, revokeSession, validateSessionToken, getUserById, getCurrentUser } from "@/lib/auth/session";

/**
 * Auth Client Module - Custom Passwordless Authentication
 * 
 * This module provides authentication helpers for the D1-backed custom auth system.
 * Auth0 transitional dependencies have been removed.
 */

/**
 * Check if custom auth is configured (D1 + Brevo)
 */
export function isCustomAuthConfigured() {
  return !!process.env.AUTH_SESSION_SECRET && !!process.env.AUTH_OTP_PEPPER;
}

/**
 * Get current user from D1 session (preferred method)
 */
export async function getCurrentUserFromSession(): Promise<SessionData | null> {
  const token = getCookie();
  
  if (!token) return null;
  
  try {
    // Validate and refresh session
    await validateSessionToken(token);
    
    // Find matching user
    const [session] = await db`SELECT id, email, display_name FROM sessions WHERE token_hash = ${token} LIMIT 1`;
    
    if (!session?.id) return null;
    
    // Get user data
    const [user] = await getUserById(session.id);
    
    if (user) {
      return {
        id: user.id,
        email: user.email,
        display_name: user.display_name ?? undefined,
      };
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

/**
 * Set HttpOnly cookie with hashed session token
 */
function setSessionCookie(tokenHash: string, maxAge: number): void {
  const response = new Response();
  
  response.headers.set(
    "Set-Cookie",
    `auth_session_token=${tokenHash}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`
  );
}

/**
 * Get cookie value (for server functions)
 */
function getCookie(): string | null {
  // In production Next.js server functions:
  // const cookies = request.cookies;
  // return cookies.get("auth_session_token")?.value;
  
  return null;
}

/**
 * Log out user (revoke session, clear cookie)
 */
export async function logout(): Promise<void> {
  const token = getCookie();
  
  if (token) {
    await revokeSession(token);
  }
}

/**
 * Get session expiry time for a token
 */
export async function getSessionExpiry(tokenHash: string): Promise<string | null> {
  return await import("@/lib/auth/session").then(m => m.getSessionExpiry(tokenHash));
}

/**
 * Check if user is authenticated (simplified check)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = getCookie();
  
  if (!token) return false;
  
  try {
    await validateSessionToken(token);
    
    const [session] = await db`SELECT 1 FROM sessions WHERE token_hash = ${token} LIMIT 1`;
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Get database instance for auth operations
 */
const db = getDatabase();

/**
 * Create session from email (after OTP verification)
 */
export async function createSessionFromEmail(email: string): Promise<SessionData | null> {
  // Get or create user by email
  const rows = await db`SELECT id, email, display_name FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
  
  if (!rows[0]) return null;
  
  const [user] = rows as any[];
  
  // Create session token
  const { createAndSetSession } = await import("@/lib/auth/session");
  const tokenHash = await createAndSetSession({ userId: user.id });
  
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? undefined,
  };
}

/**
 * Revoke session by email (for logout)
 */
export async function revokeSessionByEmail(email: string): Promise<void> {
  const rows = await db`SELECT token_hash FROM sessions WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
  
  for (const row of rows) {
    await revokeSession(row.token_hash as string);
  }
}

/**
 * Clean up expired sessions (housekeeping)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db`
    DELETE FROM sessions 
    WHERE expires_at < datetime('now') AND revoked_at IS NULL
  `;
  
  return result as number;
}

/**
 * Check if a user has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const rows = await db`SELECT 1 FROM admins WHERE user_id = ${userId} LIMIT 1`;
  return !!rows[0];
}

/**
 * Get all active sessions for a user (admin/debugging)
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const rows = await db`
    SELECT s.id, s.token_hash, s.expires_at, u.email as email, u.display_name 
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ${userId} AND s.revoked_at IS NULL
    ORDER BY s.created_at DESC
  `;
  
  return rows.map((row) => ({
    id: row.id as string,
    token_hash: row.token_hash as string,
    expires_at: row.expires_at as string,
    email: row.email as string,
    display_name: row.display_name as string | null,
  }));
}

type Session = {
  id: string;
  token_hash: string;
  expires_at: string;
  email: string;
  display_name?: string | null;
};

/**
 * Current user info (for server-side use)
 */
export async function getCurrentUserInfo(): Promise<SessionData | null> {
  return await getD1Session();
}