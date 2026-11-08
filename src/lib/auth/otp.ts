import "server-only";

const encoder = new TextEncoder();

function requiredSecret(name: "AUTH_OTP_PEPPER" | "AUTH_SESSION_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return value;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateEmailOtp() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(random[0] % 1_000_000).padStart(6, "0");
}

export async function hashEmailOtp(email: string, code: string) {
  const pepper = requiredSecret("AUTH_OTP_PEPPER");
  const normalizedEmail = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${normalizedEmail}:${code}:${pepper}`),
  );
  return bytesToHex(new Uint8Array(digest));
}

export async function createSessionToken() {
  const secret = requiredSecret("AUTH_SESSION_SECRET");
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = bytesToHex(random);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${token}:${secret}`),
  );
  return { token, tokenHash: bytesToHex(new Uint8Array(digest)) };
}

export async function hashSessionToken(token: string) {
  const secret = requiredSecret("AUTH_SESSION_SECRET");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${token}:${secret}`),
  );
  return bytesToHex(new Uint8Array(digest));
}
