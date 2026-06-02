import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { requireAdminUser } from "@/lib/auth/admin";
import { deleteProductImageFromR2 } from "@/lib/r2/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProductImageRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: ProductImageRouteContext) {
  const admin = await requireAdminUser();

  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: image, error: readError } = await supabase
    .from<{ r2_key: string }>("product_images")
    .select("r2_key")
    .eq("id", id)
    .single();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 404 });
  }

  await deleteProductImageFromR2(image.r2_key);

  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
