function requireEnv(keys: readonly string[]) {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(", ")}`);
  }
}

const supabaseEnvKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const r2EnvKeys = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
] as const;

export type SupabaseEnv = Record<(typeof supabaseEnvKeys)[number], string>;
export type R2Env = Record<(typeof r2EnvKeys)[number], string>;

export function getSupabaseEnv(): SupabaseEnv {
  requireEnv(supabaseEnvKeys);

  return {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

export function getR2Env(): R2Env {
  requireEnv(r2EnvKeys);

  return {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL!,
  };
}

export function getAdminUserIds() {
  return (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getPublicR2BaseUrl() {
  return getR2Env().R2_PUBLIC_BASE_URL.replace(/\/$/, "");
}
