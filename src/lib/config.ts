import { z } from "zod";

const origin = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
}, "Expected an HTTP(S) origin without credentials, path, query, or fragment");

export const authConfigSchema = z.object({
  AUTH0_DOMAIN: z.string().min(1).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_SECRET: z.string().regex(/^[a-f0-9]{64}$/i),
  APP_BASE_URL: origin,
});

export const databaseConfigSchema = z.object({
  DATABASE_URL: z.url().refine((value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol)),
});

export const r2ConfigSchema = z.object({
  R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/i),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PUBLIC_BUCKET_NAME: z.string().min(1),
  R2_PRIVATE_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.url().refine((value) => new URL(value).protocol === "https:"),
}).refine((value) => value.R2_PUBLIC_BUCKET_NAME !== value.R2_PRIVATE_BUCKET_NAME, "Public and private media require separate buckets");

export class ConfigurationError extends Error {
  constructor(service: string) {
    super(`${service} is not configured`);
    this.name = "ConfigurationError";
  }
}

export function readConfiguration<T>(schema: z.ZodType<T>, service: string): T {
  const result = schema.safeParse(process.env);
  // Never include Zod input or environment values in thrown errors.
  if (!result.success) throw new ConfigurationError(service);
  return result.data;
}
