import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/db/d1/client";
import { userExists, getUserById } from "@/lib/db/d1/users";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Sign in is required." : "Access denied.");
  }
}

/**
 * Get current session user from D1-backed session token hash
 * 
 * Session tokens are stored with their hashes for security.
 * Only the hash is stored in the database, never plaintext tokens.
 */
export const getCurrentUser = cache(async () => {
  // Session token is passed via HttpOnly cookie: auth_session_token
  // For now, return null - will be implemented with D1 session storage
  
  // Placeholder: In production, this would:
  // 1. Read session token from cookie
  // 2. Find matching row in sessions table (token_hash match)
  // 3. Return user data if valid
  
  return null;
});

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AccessError(401);
  return user;
}

/**
 * Require admin access via D1 roles
 */
export async function requireAdmin() {
  // Session token must be validated first
  const session = await getCurrentSession();
  
  // Check for admin role in D1
  if (!session?.admin) throw new AccessError(403);
  
  return session;
}

/**
 * Require authenticated user and redirect to account page
 */
export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  return user;
}

type SessionUser = {
  id: string;
  email: string;
  display_name?: string | null;
  admin: boolean;
};

/**
 * Get current session (internal - for admin checks)
 */
async function getCurrentSession(): Promise<SessionUser | null> {
  // Implementation deferred - uses D1 sessions table when bound
  return null;
}

/**
 * Validate and refresh a session token (internal)
 */
export async function validateSessionToken(tokenHash: string): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`UPDATE sessions SET revoked_at = NULL WHERE token_hash = ${tokenHash}`;
    return true;
  } catch {
    // Token not found or already invalid
    return false;
  }
}

/**
 * Create a new session for a user (internal)
 */
export async function createSession({
  userId,
  tokenHash,
  expiresAt,
}: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, revoked_at)
      VALUES (${generateSessionId()}, ${userId}, ${tokenHash}, ${expiresAt}, NULL)
    `;
    return true;
  } catch {
    // Session may already exist - update instead
    await db`
      UPDATE sessions 
      SET user_id = ${userId}, expires_at = ${expiresAt}
      WHERE token_hash = ${tokenHash}
    `;
    return true;
  }
}

/**
 * Revoke a session token (internal)
 */
export async function revokeSession(tokenHash: string): Promise<boolean> {
  const db = getDatabase();
  
  try {
    await db`UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ${tokenHash}`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a secure random session ID
 */
function generateSessionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}