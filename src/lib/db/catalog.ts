import "server-only";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { publicProductSchema, type PublicProduct } from "@/schemas/catalog";

export async function getPublishedProducts(): Promise<PublicProduct[]> {
  // The unconfigured foundation has no invented products or seeded commerce data.
  if (!isDatabaseConfigured()) return [];
  const rows = await getDatabase()`
    select id, name, slug, description from public.products
    where status = 'published' and deleted_at is null
    order by created_at desc, id desc limit 48
  `;
  return rows.map((row) => publicProductSchema.parse(row));
}
