import "server-only";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Configuration } from "@/lib/r2/client";
import { mediaInputSchema, privateObjectKeySchema, type MediaInput } from "@/schemas/media";

const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Internal infrastructure only. Callers MUST authorize the owner/purpose first.
 * No upload endpoint is exposed until quota, rate-limit and finalization checks exist.
 */
export async function createMediaUpload(input: MediaInput) {
  const media = mediaInputSchema.parse(input);
  const env = getR2Configuration();
  const isPrivate = media.purpose !== "product";
  const objectKey = `${media.purpose}/${media.ownerId}/${randomUUID()}.${extensions[media.contentType]}`;
  const cacheControl = isPrivate ? "private, no-store" : "public, max-age=31536000, immutable";
  const command = new PutObjectCommand({
    Bucket: isPrivate ? env.R2_PRIVATE_BUCKET_NAME : env.R2_PUBLIC_BUCKET_NAME,
    Key: objectKey,
    ContentType: media.contentType,
    ContentLength: media.byteLength,
    CacheControl: cacheControl,
  });
  return {
    objectKey,
    uploadUrl: await getSignedUrl(getR2(), command, { expiresIn: 300 }),
    headers: { "Content-Type": media.contentType, "Cache-Control": cacheControl },
    publicUrl: isPrivate ? null : `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey}`,
  };
}

/** Call only after authorizing the associated order or profile. Never persist signed URLs. */
export async function createPrivateMediaRead(objectKey: string) {
  const key = privateObjectKeySchema.parse(objectKey);
  return getSignedUrl(getR2(), new GetObjectCommand({ Bucket: getR2Configuration().R2_PRIVATE_BUCKET_NAME, Key: key }), { expiresIn: 60 });
}
