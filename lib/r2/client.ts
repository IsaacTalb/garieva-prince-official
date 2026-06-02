import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getPublicR2BaseUrl, getR2Env } from "@/lib/env";

function createR2Client() {
  const env = getR2Env();

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

export async function uploadProductImageToR2(file: File, productSlug: string, sortOrder: number) {
  const env = getR2Env();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "webp";
  const key = `products/${productSlug}/${Date.now()}-${sortOrder}-${safeFileName(file.name || `image.${extension}`)}`;
  const body = Buffer.from(await file.arrayBuffer());

  await createR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return {
    r2Key: key,
    imageUrl: `${getPublicR2BaseUrl()}/${key}`,
  };
}

export async function deleteProductImageFromR2(r2Key: string) {
  const env = getR2Env();

  await createR2Client().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: r2Key,
    }),
  );
}
