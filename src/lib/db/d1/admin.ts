import "server-only";
import { getDatabase } from "./d1/client";
import { getUserById, hasAdminRoleOfType, removeAdminRole as removeFromUsers } from "./d1/users";

export type AdminUser = {
  id: string;
  email: string;
  display_name?: string | null;
  role: "super_admin" | "admin" | "manager";
};

export type AdminRole = {
  role: "super_admin" | "admin" | "manager";
};

/**
 * Check if current user has admin access via D1 roles
 */
export async function checkAdminAccess(userId: string): Promise<boolean> {
  const db = getDatabase();
  
  // First check if session is valid and user exists
  const user = await getUserById(userId);
  if (!user) return false;
  
  // Check for any admin role in D1
  const [admin] = await db`SELECT 1 FROM admins WHERE user_id = ${userId} LIMIT 1`;
  return !!admin;
}

/**
 * Get all admins (admin only)
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  const db = getDatabase();
  
  // Get all users with admin roles
  const rows = await db`
    SELECT 
      u.id,
      u.email,
      u.name as display_name,
      a.role
    FROM admins a
    JOIN users u ON a.user_id = u.id
    ORDER BY 
      CASE a.role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
      END,
      u.email
  `;
  
  return rows.map(row => ({
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? undefined,
    role: row.role as "super_admin" | "admin" | "manager",
  }));
}

/**
 * Get admin user by ID (with role check)
 */
export async function getAdminUserById(userId: string): Promise<AdminUser | null> {
  const user = await getUserById(userId);
  
  if (!user) return null;
  
  // Check for admin role in D1
  const [admin] = await db`SELECT role FROM admins WHERE user_id = ${userId} LIMIT 1`;
  
  if (!admin) return null;
  
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? undefined,
    role: admin.role as "super_admin" | "admin" | "manager",
  };
}

/**
 * Grant admin role to a user (admin only)
 */
export async function grantAdminRole({
  userId,
  role,
}: {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}): Promise<void> {
  const db = getDatabase();
  
  // Verify caller is admin
  if (!(await checkAdminAccess(userId))) {
    throw new Error("Caller must have admin role");
  }
  
  // Insert or update admin record
  await db`
    INSERT INTO admins (id, user_id, role, created_at)
    VALUES (${userId}, ${userId}, ${role}, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      role = excluded.role,
      created_at = excluded.created_at
  `;
  
  // Log to audit trail
  await logAdminAction({
    userId,
    action: "admin_role_granted",
    details: { role },
  });
}

/**
 * Revoke admin role from a user (admin only)
 */
export async function revokeAdminRole({
  userId,
  role,
}: {
  userId: string;
  role?: "super_admin" | "admin" | "manager";
}): Promise<void> {
  const db = getDatabase();
  
  // Verify caller is admin (unless it's a super_admin removing another)
  if (!(await checkAdminAccess(userId))) {
    throw new Error("Caller must have admin role");
  }
  
  if (role) {
    // Revoke specific role
    await db`DELETE FROM admins WHERE user_id = ${userId} AND role = ${role}`;
  } else {
    // Remove all roles (dangerous - use with caution)
    await db`DELETE FROM admins WHERE user_id = ${userId}`;
  }
  
  // Log to audit trail
  await logAdminAction({
    userId,
    action: "admin_role_revoked",
    details: { role },
  });
}

/**
 * Get admin info for a user
 */
export async function getAdminInfo(userId: string): Promise<AdminRole | null> {
  const db = getDatabase();
  
  const [result] = await db`SELECT role FROM admins WHERE user_id = ${userId} LIMIT 1`;
  
  return result ? ({ role: result.role as "super_admin" | "admin" | "manager" }) : null;
}

/**
 * Get admin user count
 */
export async function getAdminUserCount(): Promise<number> {
  const db = getDatabase();
  const [result] = await db`SELECT COUNT(*) as count FROM admins`;
  return result?.count ?? 0;
}

/**
 * Log admin action to audit trail
 */
async function logAdminAction({
  userId,
  action,
  details,
}: {
  userId: string;
  action: string;
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getDatabase();
    const user = await getUserById(userId);
    
    if (user) {
      await db`
        INSERT INTO audit_logs (action, details)
        VALUES (${"admin:" + action}, ${JSON.stringify(details)})
      `;
    }
  } catch {
    // Audit log failed - don't fail the admin operation
  }
}

/**
 * Get admins by role (for filtering)
 */
export async function getAdminsByRole(
  role: "super_admin" | "admin" | "manager"
): Promise<AdminUser[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      u.id,
      u.email,
      u.name as display_name,
      a.role
    FROM admins a
    JOIN users u ON a.user_id = u.id
    WHERE a.role = ${role}
    ORDER BY u.email
  `;
  
  return rows.map(row => ({
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? undefined,
    role: row.role as "super_admin" | "admin" | "manager",
  }));
}

/**
 * Check if user has specific admin role
 */
export async function hasAdminRole(userId: string, role: "super_admin" | "admin" | "manager"): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db`SELECT 1 FROM admins WHERE user_id = ${userId} AND role = ${role} LIMIT 1`;
  return !!result;
}

/**
 * Require admin access (throws if no admin role)
 */
export async function requireAdminAccess(userId: string): Promise<AdminUser> {
  const admin = await getAdminUserById(userId);
  
  if (!admin) {
    throw new Error("Access denied: user does not have admin role");
  }
  
  return admin;
}

/**
 * Create super admin (bootstrap only, usually done manually)
 */
export async function createSuperAdmin({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<void> {
  const db = getDatabase();
  
  // Ensure user exists in users table first
  await db`
    INSERT OR IGNORE INTO users (id, email, created_at)
    VALUES (${userId}, ${email}, datetime('now'))
  `;
  
  // Grant super_admin role
  await db`
    INSERT INTO admins (id, user_id, role, created_at)
    VALUES (${userId}, ${userId}, 'super_admin', datetime('now'))
  `;
}

/**
 * Revoke all admin roles from a user (dangerous - use with extreme caution)
 */
export async function removeAllAdminRoles(userId: string): Promise<void> {
  const db = getDatabase();
  
  await db`DELETE FROM admins WHERE user_id = ${userId}`;
}