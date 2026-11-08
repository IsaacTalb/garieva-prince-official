import "server-only";
import { getUserById } from "./d1/users";
import { hasAdminRoleOfType, removeAdminRole as removeFromUsers } from "./d1/users";

/**
 * Check if current user has admin access via D1 roles
 */
export async function checkAdminAccess(userId: string): Promise<boolean> {
  const db = await getDatabase(); // Will be implemented later
  
  return false; // Placeholder until bound
}

/**
 * Get all admins (admin only)
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  // Implementation deferred - uses D1 query when bound
  return [];
}

type AdminUser = {
  id: string;
  email: string;
  display_name?: string | null;
  role: "super_admin" | "admin" | "manager";
};

/**
 * Get admin user by ID
 */
export async function getAdminUserById(userId: string): Promise<AdminUser | null> {
  const user = await getUserById(userId);
  
  if (!user) return null;
  
  // In production, query D1 for admin roles
  // For now, assume all users can be admins (transitional from Auth0/PostgreSQL)
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: "admin",
  };
}

/**
 * Grant admin role to a user
 */
export async function grantAdminRole({
  userId,
  role,
}: {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}): Promise<void> {
  // Implementation deferred - uses D1 when bound
  console.log(`Granting admin role ${role} to user ${userId}`);
}

/**
 * Revoke admin role from a user
 */
export async function revokeAdminRole({
  userId,
  role,
}: {
  userId: string;
  role?: "super_admin" | "admin" | "manager";
}): Promise<void> {
  // Implementation deferred - uses D1 when bound
  console.log(`Revoking admin role ${role ?? 'all'} from user ${userId}`);
}

/**
 * Get admin user count
 */
export async function getAdminUserCount(): Promise<number> {
  // Implementation deferred - uses D1 query when bound
  return 0;
}

/**
 * List admins with their roles (admin only)
 */
export async function listAdmins(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: AdminUser[]; total: number }> {
  // Implementation deferred - uses D1 query when bound
  return { rows: [], total: 0 };
}

/**
 * Export admin actions to audit log
 */
export async function logAdminAction({
  userId,
  action,
  entityType,
  entityId,
  notes,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  notes?: string | null;
}): Promise<void> {
  // Implementation deferred - uses audit_logs when bound
  console.log(`Admin action: ${action} on ${entityType}/${entityId} by ${userId}`);
}