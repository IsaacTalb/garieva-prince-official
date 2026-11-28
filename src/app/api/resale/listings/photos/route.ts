import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import { getR2, getR2Configuration } from "@/lib/r2/client";
import {
  failResaleListingPhoto,
  finalizeResaleListingPhoto,
  reserveResaleListingPhoto,
} from "@/lib/resale/marketplace";

const listingIdSchema = z.uuid();
const maxImageBytes = 5 * 1024 * 1024;
const maxImagePixels = 25_000_000;

function validDimensions(width: number, height: number) {
  return (
    width > 0 &&
    height > 0 &&
    width <= 10_000 &&
    height <= 10_000 &&
    width * height <= maxImagePixels
  );
}

function imageExtension(bytes: Uint8Array, contentType: string): "jpg" | "png" | null {
  if (
    contentType === "image/png" &&
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return validDimensions(view.getUint32(16), view.getUint32(20)) ? "png" : null;
  }

  if (
    contentType !== "image/jpeg" ||
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    return null;
  }

  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) return null;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (frameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      return validDimensions(width, height) ? "jpg" : null;
    }
    offset += segmentLength;
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to upload listing photos." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxImageBytes + 64 * 1024) {
    return Response.json({ error: "Each photo must be 5 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid photo upload." }, { status: 400 });
  }
  const listingId = listingIdSchema.safeParse(formData.get("listingId"));
  const files = formData.getAll("file");
  if (
    !listingId.success ||
    files.length !== 1 ||
    !(files[0] instanceof File)
  ) {
    return Response.json({ error: "Choose one valid image file." }, { status: 400 });
  }
  const file = files[0];
  if (file.size < 1 || file.size > maxImageBytes) {
    return Response.json({ error: "Each photo must be 5 MB or smaller." }, { status: 413 });
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return Response.json({ error: "Upload a JPEG or PNG image." }, { status: 400 });
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.error("Could not read resale listing photo:", error);
    return Response.json({ error: "The image could not be read." }, { status: 400 });
  }
  const extension = imageExtension(bytes, file.type);
  if (!extension) {
    return Response.json(
      { error: "The file is not a supported image or exceeds the image dimensions limit." },
      { status: 400 },
    );
  }

  const photoId = crypto.randomUUID();
  const objectKey = `garieva-prince/resale/${listingId.data}/${photoId}.${extension}`;
  let database: ReturnType<typeof getDatabase> | undefined;
  try {
    database = getDatabase();
    const reserved = await reserveResaleListingPhoto(database, {
      photoId,
      listingId: listingId.data,
      sellerUserId: user.id,
      objectKey,
      contentType: file.type as "image/jpeg" | "image/png",
      byteSize: bytes.byteLength,
    });
    if (!reserved) {
      return Response.json(
        { error: "This listing cannot accept more photos (maximum five per listing)." },
        { status: 409 },
      );
    }

    const config = getR2Configuration();
    await getR2().send(
      new PutObjectCommand({
        Bucket: config.R2_PUBLIC_BUCKET_NAME,
        Key: objectKey,
        ContentType: file.type,
        ContentLength: bytes.byteLength,
        CacheControl: "public, max-age=31536000, immutable",
        Body: bytes,
      }),
    );
    const finalized = await finalizeResaleListingPhoto(database, {
      photoId,
      listingId: listingId.data,
      sellerUserId: user.id,
    });
    if (!finalized) {
      throw new Error("The uploaded image could not be finalized in the listing.");
    }
    return Response.json({ success: true });
  } catch (error) {
    try {
      const config = getR2Configuration();
      await getR2().send(
        new DeleteObjectCommand({
          Bucket: config.R2_PUBLIC_BUCKET_NAME,
          Key: objectKey,
        }),
      );
    } catch (cleanupError) {
      console.error("Could not clean up failed resale photo upload:", cleanupError);
    }
    if (database) {
      try {
        await failResaleListingPhoto(database, {
          photoId,
          sellerUserId: user.id,
        });
      } catch (cleanupError) {
        console.error("Could not release failed resale photo slot:", cleanupError);
      }
    }
    console.error("Could not upload resale listing photo:", error);
    return Response.json(
      { error: "The photo upload failed. You can retry from your resale account." },
      { status: 500 },
    );
  }
}
