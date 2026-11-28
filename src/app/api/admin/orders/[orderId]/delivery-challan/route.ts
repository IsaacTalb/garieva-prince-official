import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { AccessError, requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import {
  getCurrentDeliveryChallan,
  getReplacedDeliveryChallanKeys,
  removeDeliveryChallan,
  replaceDeliveryChallan,
} from "@/lib/orders/delivery-challan";
import { createPrivateMediaRead } from "@/lib/r2/media";
import { getR2, getR2Configuration } from "@/lib/r2/client";

const maxFileBytes = 10 * 1024 * 1024;
const orderIdSchema = z.string().trim().min(1).max(255);
const deliveryFieldsSchema = z.strictObject({
  courier: z.string().trim().min(2).max(100),
  trackingNumber: z.string().trim().min(2).max(100),
});
const removeSchema = z.strictObject({ documentId: z.uuid() });

type UploadType = {
  extension: "pdf" | "jpg" | "png" | "webp";
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
};

function getUploadType(bytes: Uint8Array, mimeType: string): UploadType | null {
  if (
    mimeType === "application/pdf" &&
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
  ) {
    return { extension: "pdf", mimeType };
  }
  if (
    mimeType === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", mimeType };
  }
  if (
    mimeType === "image/png" &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", mimeType };
  }
  if (
    mimeType === "image/webp" &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp", mimeType };
  }
  return null;
}

async function authorizeAdmin() {
  try {
    return { admin: await requireAdmin(), response: null };
  } catch (error) {
    if (error instanceof AccessError) {
      return {
        admin: null,
        response: Response.json(
          { error: "Administrator access is required." },
          { status: error.status },
        ),
      };
    }
    throw error;
  }
}

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { admin, response } = await authorizeAdmin();
  if (response) return response;
  const { orderId } = await params;
  const parsedOrderId = orderIdSchema.safeParse(orderId);
  if (!parsedOrderId.success) {
    return Response.json({ error: "Invalid order." }, { status: 400 });
  }

  try {
    const document = await getCurrentDeliveryChallan(
      getDatabase(),
      parsedOrderId.data,
    );
    if (!document) {
      return Response.json({ error: "Delivery challan not found." }, { status: 404 });
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: await createPrivateMediaRead(document.objectKey),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(`Admin ${admin.id} could not open delivery challan:`, error);
    return Response.json(
      { error: "The private delivery challan could not be opened." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { admin, response } = await authorizeAdmin();
  if (response) return response;
  const { orderId } = await params;
  const parsedOrderId = orderIdSchema.safeParse(orderId);
  if (!parsedOrderId.success) {
    return Response.json({ error: "Invalid order." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxFileBytes + 64 * 1024) {
    return Response.json({ error: "The file must be 10 MB or smaller." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid delivery document upload." }, { status: 400 });
  }
  const fields = deliveryFieldsSchema.safeParse({
    courier: formData.get("courier"),
    trackingNumber: formData.get("trackingNumber"),
  });
  const files = formData.getAll("file");
  if (!fields.success || files.length !== 1 || !(files[0] instanceof File)) {
    return Response.json(
      { error: "Enter courier and tracking details and choose one file." },
      { status: 400 },
    );
  }
  const file = files[0];
  if (file.size < 1 || file.size > maxFileBytes) {
    return Response.json({ error: "The file must be 10 MB or smaller." }, { status: 413 });
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.error("Could not read delivery challan upload:", error);
    return Response.json({ error: "The delivery document could not be read." }, { status: 400 });
  }
  const uploadType = getUploadType(bytes, file.type);
  if (!uploadType) {
    return Response.json(
      { error: "Upload a valid PDF, JPEG, PNG, or WebP file." },
      { status: 400 },
    );
  }

  let database: ReturnType<typeof getDatabase>;
  try {
    database = getDatabase();
    const [order] = await database`
      SELECT id
      FROM orders
      WHERE id = ${parsedOrderId.data}
        AND payment_status = 'approved'
        AND status IN ('paid', 'processing', 'shipped')
      LIMIT 1
    `;
    if (!order) {
      return Response.json(
        { error: "Only paid orders can be marked shipped." },
        { status: 409 },
      );
    }
  } catch (error) {
    console.error("Could not validate delivery challan order:", error);
    return Response.json({ error: "The order could not be checked." }, { status: 500 });
  }

  const documentId = crypto.randomUUID();
  const objectKey = `order/${crypto.randomUUID()}/${documentId}.${uploadType.extension}`;
  let bucket: string;
  try {
    bucket = getR2Configuration().R2_PRIVATE_BUCKET_NAME;
    await getR2().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: uploadType.mimeType,
        ContentLength: bytes.byteLength,
        CacheControl: "private, no-store",
        Body: bytes,
      }),
    );
  } catch (error) {
    console.error("Could not store delivery challan in private R2:", error);
    return Response.json(
      { error: "The delivery document could not be stored." },
      { status: 500 },
    );
  }

  let saved: boolean;
  try {
    saved = await replaceDeliveryChallan(database, {
      documentId,
      orderId: parsedOrderId.data,
      adminUserId: admin.id,
      objectKey,
      mimeType: uploadType.mimeType,
      courier: fields.data.courier,
      trackingNumber: fields.data.trackingNumber,
    });
  } catch (error) {
    try {
      await getR2().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch (cleanupError) {
      console.error("Could not clean up an unlinked delivery challan:", cleanupError);
    }
    console.error("Could not save delivery challan metadata:", error);
    return Response.json(
      { error: "The delivery document could not be attached to the order." },
      { status: 500 },
    );
  }
  if (!saved) {
    try {
      await getR2().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch (cleanupError) {
      console.error("Could not clean up a rejected delivery challan:", cleanupError);
    }
    return Response.json(
      { error: "The order changed and the document was not attached." },
      { status: 409 },
    );
  }

  let cleanupWarning = false;
  try {
    const replacedKeys = await getReplacedDeliveryChallanKeys(database, documentId);
    for (const replacedKey of replacedKeys) {
      try {
        await getR2().send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: replacedKey,
          }),
        );
      } catch (error) {
        cleanupWarning = true;
        console.error("Could not remove a replaced private delivery challan:", error);
      }
    }
  } catch (error) {
    cleanupWarning = true;
    console.error("Could not find replaced delivery challan objects:", error);
  }

  return Response.json({ success: true, cleanupWarning });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { admin, response } = await authorizeAdmin();
  if (response) return response;
  const { orderId } = await params;
  const parsedOrderId = orderIdSchema.safeParse(orderId);
  if (!parsedOrderId.success) {
    return Response.json({ error: "Invalid order." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid delivery challan action." }, { status: 400 });
  }
  const parsedBody = removeSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: "Invalid delivery challan action." }, { status: 400 });
  }

  try {
    const database = getDatabase();
    const document = await getCurrentDeliveryChallan(
      database,
      parsedOrderId.data,
    );
    if (!document || document.id !== parsedBody.data.documentId) {
      return Response.json({ error: "Delivery challan not found." }, { status: 404 });
    }
    const removed = await removeDeliveryChallan(database, {
      documentId: document.id,
      orderId: parsedOrderId.data,
      adminUserId: admin.id,
    });
    if (!removed) {
      return Response.json(
        { error: "The delivery challan changed before it could be removed." },
        { status: 409 },
      );
    }

    try {
      await getR2().send(
        new DeleteObjectCommand({
          Bucket: getR2Configuration().R2_PRIVATE_BUCKET_NAME,
          Key: document.objectKey,
        }),
      );
      return Response.json({ success: true, cleanupWarning: false });
    } catch (error) {
      console.error("Challan metadata was removed but its R2 object remains:", error);
      return Response.json({ success: true, cleanupWarning: true });
    }
  } catch (error) {
    console.error("Could not remove delivery challan:", error);
    return Response.json(
      { error: "The delivery challan could not be removed." },
      { status: 500 },
    );
  }
}
