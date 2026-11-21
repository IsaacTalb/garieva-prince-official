import "server-only";
import { getDatabase } from "./client";
import { publicProductSchema, type PublicProduct } from "@/schemas/catalog";

export async function getPublishedProducts(search = ""): Promise<PublicProduct[]> {
  const db = getDatabase();
  const term = search.trim().slice(0, 120);
  const rows = await db`
    SELECT id, name, slug, COALESCE(description, '') AS description
    FROM products
    WHERE is_active = 1
      AND (
        ${term} = ''
        OR lower(name) LIKE lower(${"%" + term + "%"})
        OR lower(COALESCE(description, '')) LIKE lower(${"%" + term + "%"})
      )
    ORDER BY created_at DESC, id DESC
    LIMIT 48
  `;

  return rows.map((row) =>
    publicProductSchema.parse({
      ...row,
      image_url: null,
      image_alt: null,
    })
  );
}

export async function getPublishedProductBySlug(
  slug: string
): Promise<PublicProduct | null> {
  const db = getDatabase();
  const [row] = await db`
    SELECT id, name, slug, COALESCE(description, '') AS description
    FROM products
    WHERE is_active = 1 AND slug = ${slug}
    LIMIT 1
  `;

  if (!row) return null;

  return publicProductSchema.parse({
    ...row,
    image_url: null,
    image_alt: null,
  });
}
