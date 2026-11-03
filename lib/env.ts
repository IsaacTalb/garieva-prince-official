function requireEnv(keys: readonly string[]) {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(", ")}`);
  }
}

const authEnvKeys = [
  "AUTH_SESSION_SECRET",
  "AUTH_OTP_PEPPER",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
] as const;

export type AuthEnv = Record<(typeof authEnvKeys)[number], string>;

export function getAuthEnv(): AuthEnv {
  requireEnv(authEnvKeys);
  return {
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET!,
    AUTH_OTP_PEPPER: process.env.AUTH_OTP_PEPPER!,
    BREVO_API_KEY: process.env.BREVO_API_KEY!,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL!,
  };
}

export function getOtpTtlSeconds() {
  return Number(process.env.AUTH_OTP_TTL_SECONDS ?? 600);
}

export function getSessionTtlSeconds() {
  return Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 2592000);
}

export function getPublicR2BaseUrl() {
  return (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
}
