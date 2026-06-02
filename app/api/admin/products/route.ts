import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { requireAdminUser } from "@/lib/auth/admin";
import { parseProductFormData } from "@/lib/products/form-data";
import { uploadProductImageToR2 } from "@/lib/r2/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Product, ProductImageInsert, ProductVariantInsert, ProductWithRelations } from "@/types/database";

export async function GET() {
  const admin = await requireAdminUser();

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from<ProductWithRelations[]>("products")
    .select("*, product_images(*), product_variants(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status });
  }

  try {
    const payload = parseProductFormData(await request.formData());
    const supabase = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabase
      .from<Product>("products")
      .insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        category: payload.category,
        price: payload.price,
        stock: payload.stock,
        is_active: payload.is_active,
      })
      .select()
      .single();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 400 });
    }

    const uploadedImages = await Promise.all(
      payload.images.map(async (file, index) => {
        const uploaded = await uploadProductImageToR2(file, payload.slug, index);

        return {
          product_id: product.id,
          image_url: uploaded.imageUrl,
          r2_key: uploaded.r2Key,
          sort_order: index,
        } satisfies ProductImageInsert;
      }),
    );

    if (uploadedImages.length > 0) {
      const { error: imageError } = await supabase.from("product_images").insert(uploadedImages);

      if (imageError) {
        return NextResponse.json({ error: imageError.message }, { status: 500 });
      }
    }

    if (payload.variants.length > 0) {
      const variants = payload.variants.map(
        (variant) =>
          ({
            product_id: product.id,
            color: variant.color ?? null,
            size: variant.size ?? null,
            stock: variant.stock ?? 0,
          }) satisfies ProductVariantInsert,
      );
      const { error: variantError } = await supabase.from("product_variants").insert(variants);

      if (variantError) {
        return NextResponse.json({ error: variantError.message }, { status: 500 });
      }
    }

    const { data: createdProduct, error: readError } = await supabase
      .from<ProductWithRelations>("products")
      .select("*, product_images(*), product_variants(*)")
      .eq("id", product.id)
      .single();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    return NextResponse.json({ product: createdProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create product" },
      { status: 400 },
    );
  }
}
