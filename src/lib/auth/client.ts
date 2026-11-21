import "server-only";
import { getDatabase } from "@/lib/db/d1/client";
import {
  getCurrentUser,
  revokeSession,
  validateSessionToken,
} from "@/lib/auth/session";
import { getUserByEmail, hasAdminRole } from "@/lib/db/d1/users";

export function isCustomAuthConfigured() {
  return !!process.env.AUTH_SESSION_SECRET && !!process.env.AUTH_OTP_PEPPER;
}

export async function getCurrentUserFromSession(): Promise<SessionData | null> {
  const user = await getCurrentUser();
  return user
    ? {
        id: user.id,
        email: user.email ?? "",
        display_name: user.display_name,
      }
    : null;
}

type SessionData = {
  id: string;
  email: string;
  display_name?: string | null;
};

export async function logout(tokenHash: string): Promise<void> {
  if (await validateSessionToken(tokenHash)) {
    await revokeSession(tokenHash);
  }
}

export async function getSessionExpiry(tokenHash: string): Promise<string | null> {
  const db = getDatabase();
  const [session] = await db`
    SELECT expires_at FROM sessions
    WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
    LIMIT 1
  `;
  return session?.expires_at ? String(session.expires_at) : null;
}

export async function isAuthenticated(): Promise<boolean> {
  return !!(await getCurrentUser());
}

export async function createSessionFromEmail(email: string): Promise<SessionData | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const { createAndSetSession } = await import("@/lib/auth/session");
  await createAndSetSession({ userId: user.id });
  return {
    id: user.id,
    email: user.email ?? "",
    display_name: user.display_name,
  };
}

export async function revokeSessionByEmail(email: string): Promise<void> {
  const db = getDatabase();
  const sessions = await db`
    SELECT s.token_hash
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE lower(u.email) = lower(${email}) AND s.revoked_at IS NULL
  `;
  for (const session of sessions) {
    await revokeSession(String(session.token_hash));
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDatabase();
  const result = await db`
    DELETE FROM sessions
    WHERE julianday(expires_at) <= julianday('now') AND revoked_at IS NULL
    RETURNING id
  `;
  return result.length;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  return hasAdminRole(userId);
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const db = getDatabase();
  const rows = await db`
    SELECT s.id, s.token_hash, s.expires_at, u.email, u.name AS display_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ${userId} AND s.revoked_at IS NULL
    ORDER BY s.created_at DESC
  `;
  return rows.map((row) => ({
    id: String(row.id),
    token_hash: String(row.token_hash),
    expires_at: String(row.expires_at),
    email: String(row.email),
    display_name: row.display_name == null ? null : String(row.display_name),
  }));
}

type Session = {
  id: string;
  token_hash: string;
  expires_at: string;
  email: string;
  display_name: string | null;
};

export async function getCurrentUserInfo(): Promise<SessionData | null> {
  return getCurrentUserFromSession();
}
