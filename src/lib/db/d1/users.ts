import "server-only";
import { getDatabase } from "./d1/client";
import { AppUserSchema, type AppUser } from "@/schemas/user";

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
 * Create a new user account
 */
export async function createUser({
  email,
  name,
  username,
  phone,
  avatar_url,
}: {
  email: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}): Promise<AppUser> {
  const db = getDatabase();
  
  const [result] = await db`
    INSERT INTO users (email, name, username, phone, avatar_url)
    VALUES (${email}, ${name}, ${username}, ${phone}, ${avatar_url})
    RETURNING id, email, name as display_name, username, phone, avatar_url, profile_visibility, created_at, updated_at
  `;
  
  try {
    return AppUserSchema.parse(result);
  } catch (error) {
    throw new Error(`Invalid user data: ${(error as Error).message}`);
  }
}

/**
 * Get all users with optional filters
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
    rows = await db`
      SELECT * FROM users
      LIMIT ${limit} OFFSET ${offset}
    `;
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
 * Check if a user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM users WHERE id = ${userId} LIMIT 1`;
  return !!result;
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase();
  await db`DELETE FROM users WHERE id = ${userId}`;
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
  const [result] = await db`
    SELECT 1 FROM admins WHERE user_id = ${userId} LIMIT 1
  `;
  return !!result;
}

/**
 * Check if a user has specific admin role
 */
export async function hasAdminRoleOfType(userId: string, role: "super_admin" | "admin" | "manager"): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`
    SELECT 1 FROM admins WHERE user_id = ${userId} AND role = ${role} LIMIT 1
  `;
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