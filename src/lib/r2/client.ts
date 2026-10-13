import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { r2ConfigSchema, readConfiguration } from "@/lib/config";

let client: S3Client | undefined;

export function getR2Configuration() {
  return readConfiguration(r2ConfigSchema, "Media storage");
}

export function getR2() {
  if (!client) {
    const env = getR2Configuration();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}
