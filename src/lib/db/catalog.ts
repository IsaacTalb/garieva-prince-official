import "server-only";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import { publicProductSchema, type PublicProduct } from "@/schemas/catalog";

function publicMediaUrl(key: unknown) {
  if (typeof key !== "string" || !key.startsWith("product/")) return null;
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (key.split("/").some((part) => part === "." || part === "..")) return null;
    return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
  } catch {
    return null;
  }
}

async function readProducts(search = "", slug: string | null = null): Promise<PublicProduct[]> {
  // The unconfigured foundation has no invented products or seeded commerce data.
  if (!isDatabaseConfigured()) return [];
  const rows = await getDatabase()`
    select p.id, p.name, p.slug, p.description, m.object_key, m.alt_text as image_alt
    from public.products p
    left join lateral (
      select object_key, alt_text from public.product_media
      where product_id = p.id order by position, id limit 1
    ) m on true
    where p.status = 'published' and p.deleted_at is null
      and (${slug}::text is null or p.slug = ${slug})
      and (${search} = '' or position(lower(${search}) in lower(p.name || ' ' || p.description)) > 0)
    order by p.created_at desc, p.id desc limit 48
  `;
  return rows.map((row) => publicProductSchema.parse({ ...row, image_url: publicMediaUrl(row.object_key) }));
}

export function getPublishedProducts(search = "") {
  return readProducts(search.trim().slice(0, 120));
}

export async function getPublishedProductBySlug(slug: string) {
  return (await readProducts("", slug))[0] ?? null;
}
