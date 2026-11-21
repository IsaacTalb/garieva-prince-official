import "server-only";
import { getDatabase } from "./client";
import { appUserSchema, profileSchema, type AppUser } from "@/schemas/user";

/**
 * User Repository - D1-backed custom authentication
 * 
 * This repository manages user accounts for the Garieva Prince application.
 * Uses D1 database with opaque session tokens (no Auth0/PostgreSQL).
 */

type CreateUserData = {
  email: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

function parseUserRow(row: Record<string, unknown>): AppUser {
  return appUserSchema.parse({
    ...row,
    display_name: row.display_name ?? row.name ?? null,
    profile_visibility:
      row.profile_visibility ??
      (Number(row.show_profile_publicly) === 1 ? "public" : "private"),
  });
}

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<AppUser | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  if (!rows[0]) return null;
  try {
    return parseUserRow(rows[0]);
  } catch (error) {
    throw new Error(`Invalid user data for ${userId}: ${(error as Error).message}`);
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM users WHERE lower(email) = lower(${email})`;
  if (!rows[0]) return null;
  try {
    return parseUserRow(rows[0]);
  } catch (error) {
    throw new Error(`Invalid user data for ${email}: ${(error as Error).message}`);
  }
}

/**
 * Check if a user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM users WHERE id = ${userId} LIMIT 1`;
  return !!result;
}

/**
 * Check if a user exists by email
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
  return !!result;
}

/**
 * Create a new user account (after OTP verification)
 */
export async function createUser({
  email,
  name,
  username,
  phone,
  avatar_url,
}: CreateUserData): Promise<AppUser> {
  const db = getDatabase();
  const [result] = await db`
    INSERT INTO users (id, email, name, username, phone, avatar_url)
    VALUES (${crypto.randomUUID()}, ${email}, ${name}, ${username}, ${phone}, ${avatar_url})
    RETURNING *
  `;
  try {
    return parseUserRow(result);
  } catch (error) {
    throw new Error(`Invalid user data: ${(error as Error).message}`);
  }
}

/**
 * Update user profile fields (partial update)
 */
export async function updateUser({
  userId,
  name,
  username,
  phone,
  avatar_url,
}: {
  userId: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}): Promise<AppUser | null> {
  const db = getDatabase();
  const [result] = await db`
    UPDATE users
    SET name = CASE WHEN ${name !== undefined} THEN ${name ?? null} ELSE name END,
        username = CASE WHEN ${username !== undefined} THEN ${username ?? null} ELSE username END,
        phone = CASE WHEN ${phone !== undefined} THEN ${phone ?? null} ELSE phone END,
        avatar_url = CASE WHEN ${avatar_url !== undefined} THEN ${avatar_url ?? null} ELSE avatar_url END,
        updated_at = datetime('now')
    WHERE id = ${userId}
    RETURNING *
  `;
  if (!result) return null;
  try {
    return parseUserRow(result);
  } catch (error) {
    throw new Error(`Invalid user data after update: ${(error as Error).message}`);
  }
}

export async function updateUserProfile(
  userId: string,
  input: unknown,
): Promise<AppUser | null> {
  const profile = profileSchema.parse(input);
  const db = getDatabase();
  const [result] = await db`
    UPDATE users
    SET name = ${profile.display_name},
        username = ${profile.username},
        phone = ${profile.phone},
        bio = ${profile.bio},
        instagram_url = ${profile.instagram_url},
        facebook_url = ${profile.facebook_url},
        tiktok_url = ${profile.tiktok_url},
        telegram_url = ${profile.telegram_url},
        show_profile_publicly = ${profile.show_profile_publicly ? 1 : 0},
        show_avatar_publicly = ${profile.show_avatar_publicly ? 1 : 0},
        show_instagram = ${profile.show_instagram ? 1 : 0},
        show_facebook = ${profile.show_facebook ? 1 : 0},
        show_tiktok = ${profile.show_tiktok ? 1 : 0},
        show_telegram = ${profile.show_telegram ? 1 : 0},
        updated_at = datetime('now')
    WHERE id = ${userId}
    RETURNING *
  `;
  return result ? parseUserRow(result) : null;
}

/**
 * Get all users with optional pagination
 */
export async function getAllUsers(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: AppUser[]; total: number }> {
  const db = getDatabase();
  
  const [count] = await db`SELECT COUNT(*) as total FROM users`;
  const total = typeof count.total === "number" ? count.total : 0;
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
  const offset = Math.max(0, options?.offset ?? 0);
  let rows;
  if (options?.limit || options?.offset) {
    rows = await db`SELECT * FROM users LIMIT ${limit} OFFSET ${offset}`;
  } else {
    rows = await db`SELECT * FROM users`;
  }
  try {
    return {
      rows: rows.map(parseUserRow),
      total,
    };
  } catch (error) {
    throw new Error(`Invalid user data in list: ${(error as Error).message}`);
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase();
  
  // Also remove associated sessions and admin roles
  await db`DELETE FROM admins WHERE user_id = ${userId}`;
  await db`DELETE FROM sessions WHERE user_id = ${userId}`;
  await db`DELETE FROM users WHERE id = ${userId}`;
}

/**
 * Soft delete a user (mark as deleted, keep data)
 */
export async function softDeleteUser(userId: string): Promise<void> {
  const db = getDatabase();
  
  await db`UPDATE users SET deleted_at = datetime('now') WHERE id = ${userId}`;
}

/**
 * Create an admin role for a user
 */
export async function createAdminRole({
  userId,
  role,
}: {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}): Promise<void> {
  const db = getDatabase();
  
  try {
    await db`
      INSERT OR IGNORE INTO admins (id, user_id, role)
      VALUES (${userId}, ${userId}, ${role})
    `;
  } catch (error) {
    // Ignore if admin already exists for this user
  }
}

/**
 * Check if a user has admin role
 */
export async function hasAdminRole(userId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM admins WHERE user_id = ${userId} LIMIT 1`;
  return !!result;
}

/**
 * Check if a user has specific admin role
 */
export async function hasAdminRoleOfType(userId: string, role: "super_admin" | "admin" | "manager"): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM admins WHERE user_id = ${userId} AND role = ${role} LIMIT 1`;
  return !!result;
}

/**
 * Delete admin role for a user (admin only)
 */
export async function removeAdminRole(userId: string, role?: "super_admin" | "admin" | "manager"): Promise<void> {
  const db = getDatabase();
  
  if (role) {
    await db`DELETE FROM admins WHERE user_id = ${userId} AND role = ${role}`;
  } else {
    await db`DELETE FROM admins WHERE user_id = ${userId}`;
  }
}

/**
 * Get admin info for a user
 */
export async function getAdminInfo(userId: string): Promise<AdminRole | null> {
  const db = getDatabase();
  
  const [result] = await db`SELECT role FROM admins WHERE user_id = ${userId} LIMIT 1`;
  
  return result ? ({ role: result.role as "super_admin" | "admin" | "manager" }) : null;
}

type AdminRole = {
  role: "super_admin" | "admin" | "manager";
};