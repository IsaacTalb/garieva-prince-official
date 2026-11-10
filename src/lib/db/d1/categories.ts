import "server-only";
import { getDatabase } from "./d1/client";
import { requireAdminAccess } from "./d1/admin";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

type CreateCategoryInput = {
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  sortOrder?: number;
};

/**
 * Get all categories (for dropdown/filter)
 */
export async function getAllCategories(): Promise<Category[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.parent_id,
      c.sort_order,
      c.is_active,
      c.created_at
    FROM categories c
    ORDER BY c.parent_id DESC, c.sort_order ASC, c.name ASC
  `;
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parent_id: row.parent_id ?? null,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active === 1,
    created_at: row.created_at,
  }));
}

/**
 * Get categories by parent (for dropdown)
 */
export async function getCategoriesByParent(parentId?: string): Promise<Category[]> {
  const db = getDatabase();
  
  if (!parentId) {
    return getAllCategories();
  }
  
  const rows = await db`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.parent_id,
      c.sort_order,
      c.is_active,
      c.created_at
    FROM categories c
    WHERE c.parent_id = ${parentId} OR c.parent_id IS NULL
    ORDER BY c.parent_id DESC, c.sort_order ASC, c.name ASC
  `;
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parent_id: row.parent_id ?? null,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active === 1,
    created_at: row.created_at,
  }));
}

/**
 * Get category by ID or slug
 */
export async function getCategoryByIdOrSlug(idOrSlug?: string): Promise<Category | null> {
  const db = getDatabase();
  
  if (!idOrSlug) return null;
  
  const rows = await db`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.parent_id,
      c.sort_order,
      c.is_active,
      c.created_at
    FROM categories c
    WHERE c.id = ${idOrSlug} OR c.slug = ${idOrSlug}
    LIMIT 1
  `;
  
  if (!rows[0]) return null;
  
  return {
    id: rows[0].id,
    name: rows[0].name,
    slug: rows[0].slug,
    description: rows[0].description ?? undefined,
    parent_id: rows[0].parent_id ?? null,
    sort_order: rows[0].sort_order ?? 0,
    is_active: rows[0].is_active === 1,
    created_at: rows[0].created_at,
  };
}

/**
 * Create a new category (admin only)
 */
export async function createCategory({
  name,
  slug,
  description,
  parentId,
  sortOrder,
}: CreateCategoryInput): Promise<Category> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can create categories");
  }
  
  // Generate ID if not provided
  const id = `CAT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  await db`
    INSERT INTO categories (id, parent_id, name, slug, description, sort_order, is_active, created_at)
    VALUES (${id}, ${parentId}, ${name}, ${slug}, ${description ?? null}, 
            COALESCE(${sortOrder}, 0), 1, datetime('now'))
    RETURNING id, parent_id, name, slug, description, sort_order, is_active, created_at
  `;
  
  return {
    id,
    parent_id: parentId ?? null,
    name,
    slug,
    description: description ?? undefined,
    sort_order: sortOrder ?? 0,
    is_active: true,
    created_at: (await db`SELECT created_at FROM categories WHERE id = ${id}`).created_at!,
  };
}

/**
 * Update a category (admin only)
 */
export async function updateCategory({
  categoryId,
  name,
  slug,
  description,
  sortOrder,
}: {
  categoryId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<Category | null> {
  const db = getDatabase();
  
  // Verify admin access (use a fixed admin ID or pass as parameter)
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can update categories");
  }
  
  const [updated] = await db`
    UPDATE categories 
    SET 
      name = COALESCE(${name}, name),
      slug = COALESCE(${slug}, slug),
      description = COALESCE(${description}, description),
      sort_order = COALESCE(${sortOrder}, sort_order),
      updated_at = datetime('now')
    WHERE id = ${categoryId}
    RETURNING id, parent_id, name, slug, description, sort_order, is_active, created_at
  `;
  
  if (!updated) return null;
  
  return {
    id: updated.id,
    parent_id: updated.parent_id ?? null,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? undefined,
    sort_order: updated.sort_order ?? 0,
    is_active: updated.is_active === 1,
    created_at: updated.created_at,
  };
}

/**
 * Delete a category (admin only)
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const db = getDatabase();
  
  // Verify admin access
  if (!(await requireAdminAccess(process.env.ADMIN_USER_ID as string))) {
    throw new Error("Only admins can delete categories");
  }
  
  // Check if any products use this category
  const productRows = await db`SELECT 1 FROM products WHERE parent_category_id = ${categoryId} LIMIT 1`;
  
  if (productRows[0]) {
    throw new Error(`Cannot delete category '${categoryId}': products are using this category`);
  }
  
  await db`DELETE FROM categories WHERE id = ${categoryId}`;
}

/**
 * Get category tree for breadcrumb/navigation
 */
export async function getCategoryTree(): Promise<Category[]> {
  const db = getDatabase();
  
  // Recursive CTE for hierarchical structure
  const rows = await db`
    WITH RECURSIVE category_tree AS (
      SELECT id, parent_id, name, slug, description, sort_order, is_active, created_at, depth = 0
      FROM categories
      WHERE parent_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.sort_order, c.is_active, c.created_at, ct.depth + 1
      FROM categories c
      INNER JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT id, parent_id, name, slug, description, sort_order, is_active, created_at, depth
    FROM category_tree
    ORDER BY sort_order ASC, name ASC
  `;
  
  return rows.map(row => ({
    ...row,
    is_active: row.is_active === 1,
  }));
}

/**
 * Get active categories only
 */
export async function getActiveCategories(): Promise<Category[]> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT 
      id,
      name,
      slug,
      description,
      parent_id,
      sort_order,
      created_at
    FROM categories
    WHERE is_active = 1
    ORDER BY sort_order ASC, name ASC
  `;
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parent_id: row.parent_id ?? null,
    sort_order: row.sort_order ?? 0,
    is_active: true,
    created_at: row.created_at,
  }));
}

/**
 * Get category count (for admin dashboard)
 */
export async function getCategoryCount(): Promise<number> {
  const db = getDatabase();
  const [result] = await db`SELECT COUNT(*) as count FROM categories`;
  return result?.count ?? 0;
}