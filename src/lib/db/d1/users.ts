import "server-only";
import { getDatabase } from "./d1/client";
import { AppUserSchema, type AppUser } from "@/schemas/user";

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

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<AppUser | null> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
  
  if (!rows[0]) return null;
  
  try {
    return AppUserSchema.parse(rows[0]);
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
    return AppUserSchema.parse(rows[0]);
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
  
  // Clean up any existing account with this email to prevent duplicates
  await db`DELETE FROM users WHERE lower(email) = lower(${email})`;
  
  const [result] = await db`
    INSERT INTO users (id, email, name, username, phone, avatar_url, created_at, updated_at)
    VALUES (${generateUserId(email)}, ${email}, ${name}, ${username}, ${phone}, ${avatar_url}, datetime('now'), datetime('now'))
    RETURNING id, email, name as display_name, username, phone, avatar_url, profile_visibility, created_at, updated_at
  `;
  
  try {
    return AppUserSchema.parse(result);
  } catch (error) {
    throw new Error(`Invalid user data: ${(error as Error).message}`);
  }
}

/**
 * Generate unique user ID from email prefix + timestamp
 */
function generateUserId(email: string): string {
  return `${email.substring(0, 6)}_${Date.now()}`;
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
    SET name = ${name ?? "null"}, username = ${username ?? "null"}, phone = ${phone ?? "null"}, avatar_url = ${avatar_url ?? "null"}
    WHERE id = ${userId}
    RETURNING id, email, name as display_name, username, phone, avatar_url, profile_visibility, created_at, updated_at
  `;
  
  if (!result) return null;
  
  try {
    return AppUserSchema.parse(result);
  } catch (error) {
    throw new Error(`Invalid user data after update: ${(error as Error).message}`);
  }
}

/**
 * Get all users with optional pagination
 */
export async function getAllUsers(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: AppUser[]; total: number }> {
  const db = getDatabase();
  
  let query = `SELECT COUNT(*) as total FROM users`;
  if (options?.limit || options?.offset) {
    query += ` LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}`;
  }
  
  const [count] = await db`${query}`;
  const total = typeof count.total === "number" ? count.total : 0;
  
  let rows: { id: string; email: string; name?: string | null; username?: string | null; phone?: string | null; avatar_url?: string | null; profile_visibility: string; created_at: string; updated_at: string }[] = [];
  
  if (options?.limit || options?.offset) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    rows = await db`SELECT * FROM users LIMIT ${limit} OFFSET ${offset}`;
  } else {
    rows = await db`SELECT * FROM users`;
  }
  
  try {
    return {
      rows: rows.map(row => AppUserSchema.parse(row)),
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