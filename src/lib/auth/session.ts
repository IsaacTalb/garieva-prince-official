import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db/d1/client";
import { getUserById, hasAdminRole } from "@/lib/db/d1/users";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Sign in is required." : "Access denied.");
  }
}

/**
 * Get current session user from D1-backed session storage
 * 
 * Session tokens are stored as opaque random strings in the sessions table.
 * Only token hashes are ever stored (never plaintext).
 * 
 * Flow:
 * 1. User verifies email via Brevo OTP
 * 2. We generate opaque session token and hash it
 * 3. Store hash in D1.sessions table with expiry
 * 4. Send hashed token to client via HttpOnly cookie
 * 5. On each request, validate cookie against D1
 */
export const getCurrentUser = cache(async () => {
  const token = await getCookie();
  if (!token) return null;
  if (!(await validateSessionToken(token))) return null;

  const db = getDatabase();
  const [session] = await db`
    SELECT user_id FROM sessions
    WHERE token_hash = ${token} AND revoked_at IS NULL
    LIMIT 1
  `;
  if (!session) return null;

  const user = await getUserById(String(session.user_id));
  if (!user) {
    await revokeSession(token);
    return null;
  }
  return { ...user, admin: false };
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
  if (!user) redirect("/account/sign-in");
  return user;
}

type SessionData = {
  id: string;
  email: string;
  display_name?: string | null;
  admin: boolean;
};

/**
 * Get current session (internal - for admin checks)
 */
async function getCurrentSession(): Promise<SessionData | null> {
  const token = await getCookie();
  if (!token) return null;
  if (!(await validateSessionToken(token))) return null;

  const db = getDatabase();
  const [session] = await db`
    SELECT user_id FROM sessions
    WHERE token_hash = ${token} AND revoked_at IS NULL
    LIMIT 1
  `;
  if (!session) return null;

  const user = await getUserById(String(session.user_id));
  if (!user) {
    await revokeSession(token);
    return null;
  }
  return {
    id: user.id,
    email: user.email ?? "",
    display_name: user.display_name ?? undefined,
    admin: await hasAdminRole(user.id),
  };
}

/**
 * Generate a secure random session token (opaque, not user ID)
 */
function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  
  // Use crypto for better randomness
  const randomBytes = new Uint32Array(8);
  crypto.getRandomValues(randomBytes);
  
  for (let i = 0; i < 8; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Hash session token using server secret
 */
async function hashSessionToken(token: string): Promise<string> {
  const secret = process.env.AUTH_SESSION_SECRET;
  
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must be configured with at least 32 characters");
  }
  
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${token}:${secret}`),
  );
  
  return Array.from(new Uint8Array(digest), (byte) => 
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Get session token from cookie (client sets this via HttpOnly cookie)
 */
async function getCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_session_token")?.value ?? null;
}

/**
 * Create a new session for a user and store in D1
 */
export async function createSession({
  userId,
  tokenHash,
  expiresAt,
}: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<void> {
  const db = getDatabase();
  
  await db`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt})
  `;
}

/**
 * Create session and return hashed token to set in cookie
 */
export async function createAndSetSession({
  userId,
  ttlSeconds = 2592000, // 30 days default
}: {
  userId: string;
  ttlSeconds?: number;
}): Promise<string> {
  const token = generateSessionToken();
  const hash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  
  // Store in D1
  await createSession({ userId, tokenHash: hash, expiresAt });
  
  return hash; // Return hashed token for cookie setting
}

/**
 * Revoke a session token (logout)
 */
export async function revokeSession(tokenHash: string): Promise<void> {
  const db = getDatabase();
  await db`UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ${tokenHash}`;
}

/**
 * Validate and refresh a session token (internal)
 */
export async function validateSessionToken(tokenHash: string): Promise<boolean> {
  const db = getDatabase();
  const [session] = await db`
    SELECT 1 FROM sessions
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
      AND julianday(expires_at) > julianday('now')
    LIMIT 1
  `;
  return !!session;
}

/**
 * Create a new session from email (after OTP verification)
 */
export async function createSessionFromOtp({
  userId,
}: {
  userId: string;
}): Promise<string> {
  const ttlSeconds = parseInt(process.env.AUTH_SESSION_TTL_SECONDS ?? "2592000", 10);
  
  return createAndSetSession({ userId, ttlSeconds });
}

/**
 * Generate new session token (rotation after password change)
 */
export async function rotateSessionToken(oldTokenHash: string): Promise<string> {
  const token = generateSessionToken();
  const hash = await hashSessionToken(token);
  const db = getDatabase();
  const [session] = await db`
    SELECT user_id FROM sessions
    WHERE token_hash = ${oldTokenHash}
      AND revoked_at IS NULL
      AND julianday(expires_at) > julianday('now')
    LIMIT 1
  `;
  if (!session) throw new AccessError(401);

  await createSession({
    userId: String(session.user_id),
    tokenHash: hash,
    expiresAt: new Date(Date.now() + 2592000 * 1000).toISOString(),
  });
  await revokeSession(oldTokenHash);
  return hash;
}

/**
 * Get session expiry for a token
 */
export async function getSessionExpiry(tokenHash: string): Promise<string | null> {
  const db = getDatabase();
  
  const [session] = await db`SELECT expires_at FROM sessions WHERE token_hash = ${tokenHash} LIMIT 1`;
  
  return session?.expires_at || null;
}

/**
 * Get all active sessions for a user (debugging/admin)
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT s.*, u.email AS email, u.name AS display_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ${userId} AND s.revoked_at IS NULL
    ORDER BY created_at DESC
  `;
  
  return rows.map((row: {
    id: string;
    token_hash: string;
    expires_at: string;
    user_id: string;
    email: string;
    display_name: string | null;
  }) => ({
    id: row.id as string,
    token_hash: row.token_hash as string,
    expires_at: row.expires_at as string,
    user_id: row.user_id as string,
    email: row.email as string,
    display_name: row.display_name as string | null,
  }));
}

type Session = {
  id: string;
  token_hash: string;
  expires_at: string;
  user_id: string;
  email: string;
  display_name?: string | null;
};