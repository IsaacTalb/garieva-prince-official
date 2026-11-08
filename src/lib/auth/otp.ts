import "server-only";
import { getDatabase } from "@/lib/db/d1/client";
import { sendOtpWithTemplate } from "@/lib/email/brevo";

/**
 * OTP Service - Custom Passwordless Authentication
 * 
 * Handles 6-digit OTP generation, hashing, storage in D1, and verification.
 * Uses Brevo for email delivery (6-digit code).
 */

// Security constants
const OTP_LENGTH = 6;
const DEFAULT_OTP_TTL_SECONDS = parseInt(process.env.AUTH_OTP_TTL_SECONDS ?? "600", 10); // 10 minutes default
const MAX_ATTEMPTS = 5;

/**
 * Generate a random 6-digit OTP code (cryptographically secure)
 */
function generateOtpCode(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(random[0] % 1_000_000).padStart(6, "0");
}

/**
 * Hash OTP code before storage (prevents plaintext in database)
 */
async function hashOtp(code: string): Promise<string> {
  const pepper = process.env.AUTH_OTP_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("AUTH_OTP_PEPPER must be configured with at least 32 characters");
  }
  
  const encoder = new TextEncoder();
  const normalizedCode = code.toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${normalizedCode}:${pepper}`),
  );
  return Array.from(new Uint8Array(digest), (byte) => 
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Verify hashed OTP code against stored hash
 */
async function verifyOtpHash(code: string, storedHash: string): Promise<boolean> {
  const hashed = await hashOtp(code);
  return hashed === storedHash;
}

type EmailVerificationCode = {
  id: string;
  email: string;
  code_hash: string;
  purpose: "sign_in" | "sign_up" | "change_email";
  expires_at: string;
  consumed_at: string | null;
  attempt_count: number;
  created_at: string;
};

/**
 * Clean up expired OTP codes for rate limiting before creating new one
 */
async function cleanupExpiredOtps(email: string, purpose: "sign_in" | "sign_up"): Promise<void> {
  const now = new Date().toISOString();
  const db = getDatabase();
  
  // Delete expired consumed codes
  await db`
    DELETE FROM email_verification_codes 
    WHERE email = ${email} AND expires_at < datetime('now') AND consumed_at IS NOT NULL
  `;
  
  // Clean up codes that have been attempted too many times (reset attempts)
  const ttlMinutes = DEFAULT_OTP_TTL_SECONDS / 60;
  await db`
    UPDATE email_verification_codes 
    SET consumed_at = datetime('now'), attempt_count = 0, expires_at = datetime('now', ?)
    WHERE email = ${email} AND purpose = ${purpose} AND attempt_count >= ${MAX_ATTEMPTS - 1}
  `, `+${ttlMinutes * 60}`; // Extend expiry for reset codes
}

/**
 * Create a new OTP record in D1
 */
export async function createOtpRecord({
  email,
  purpose,
  ttlSeconds = DEFAULT_OTP_TTL_SECONDS,
}: {
  email: string;
  purpose: "sign_in" | "sign_up" | "change_email";
  ttlSeconds?: number;
}): Promise<EmailVerificationCode> {
  const db = getDatabase();
  
  // Clean up old OTPs for this email/purpose first (rate limiting)
  await cleanupExpiredOtps(email, purpose);
  
  // Generate secure OTP
  const code = generateOtpCode();
  const hash = await hashOtp(code);
  
  // Generate unique ID: email prefix + timestamp + random
  const id = `${email.substring(0, 4)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  
  // Insert OTP record (upsert for same code)
  try {
    await db`
      INSERT INTO email_verification_codes 
      (id, email, code_hash, purpose, expires_at, created_at)
      VALUES (${id}, ${email}, ${hash}, ${purpose}, ${expiresAt}, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET 
        code_hash = excluded.code_hash,
        expires_at = excluded.expires_at
    `;
  } catch (error) {
    // Handle duplicate key gracefully - OTP already exists for this email shortly after creation
    const existing = await db`SELECT * FROM email_verification_codes WHERE id = ${id} LIMIT 1`;
    if (existing[0]) {
      return existing[0] as EmailVerificationCode;
    }
    throw error;
  }
  
  return {
    id,
    email,
    code_hash: hash, // Return hashed value only
    purpose,
    expires_at: expiresAt,
    consumed_at: null,
    attempt_count: 0,
    created_at: new Date().toISOString(),
  };
}

/**
 * Verify an OTP code and mark as consumed if valid
 */
export async function verifyOtp({
  purpose,
  code,
}: {
  purpose: "sign_in" | "sign_up" | "change_email";
  code: string;
}): Promise<{ verified: true } | { verified: false; error: string }> {
  const db = getDatabase();
  
  // Find active OTP for this purpose (only one active OTP per email/purpose)
  const rows = await db`
    SELECT id, code_hash, attempt_count 
    FROM email_verification_codes 
    WHERE LOWER(email) LIKE ? 
      AND purpose = ${purpose}
      AND consumed_at IS NULL
      AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `, [code.toLowerCase()];
  
  if (!rows[0]) {
    return { verified: false, error: "Code not found or expired" };
  }
  
  const codeRow = rows[0] as Pick<EmailVerificationCode, 'id' | 'code_hash' | 'attempt_count'>;
  
  // Check rate limiting
  if (codeRow.attempt_count >= MAX_ATTEMPTS) {
    return { verified: false, error: "Too many failed attempts. Please wait before trying again." };
  }
  
  // Verify the code hash
  if (!await verifyOtpHash(code, codeRow.code_hash)) {
    await db`UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE id = ${codeRow.id}`;
    
    return { verified: false, error: "Invalid code" };
  }
  
  // Mark OTP as consumed
  await db`UPDATE email_verification_codes SET consumed_at = datetime('now') WHERE id = ${codeRow.id}`;
  
  return { verified: true };
}

/**
 * Create and send OTP via Brevo for sign-in (user already exists)
 */
export async function sendSignInOtp({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}): Promise<{ otpId: string }> {
  // Create OTP record in D1
  const otpRecord = await createOtpRecord({
    email,
    purpose: "sign_in",
  });
  
  // Send via Brevo
  await sendOtpWithTemplate({
    to: [{ email, name }],
    subject: `Your Garieva Prince Verification Code`,
    code: /* We don't return the plaintext code */ "", // Use placeholder for now
  });
  
  return { otpId: otpRecord.id };
}

/**
 * Create and send OTP via Brevo for sign-up (new user)
 */
export async function sendSignUpOtp({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}): Promise<{ otpId: string }> {
  // Create OTP record in D1
  const otpRecord = await createOtpRecord({
    email,
    purpose: "sign_up",
  });
  
  // Send via Brevo
  await sendOtpWithTemplate({
    to: [{ email, name }],
    subject: `Your Garieva Prince Verification Code`,
    code: "",
  });
  
  return { otpId: otpRecord.id };
}

/**
 * Request a new OTP (re-send) after waiting 1 second
 */
export async function resendOtp({
  email,
  purpose,
}: {
  email: string;
  purpose: "sign_in" | "sign_up";
}): Promise<EmailVerificationCode> {
  // Wait a bit between OTPs to prevent spam
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return createOtpRecord({
    email,
    purpose,
  });
}

/**
 * Get OTP status for an email (for debugging/admin)
 */
export async function getOtpStatus(email: string): Promise<{
  codeHash?: string;
  expiresAt?: string;
  createdAt?: string;
  attemptCount?: number;
  consumedAt?: string | null;
} | null> {
  const db = getDatabase();
  
  const rows = await db`
    SELECT code_hash, expires_at, created_at, attempt_count, consumed_at
    FROM email_verification_codes 
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  
  if (!rows[0]) return null;
  
  return {
    codeHash: rows[0].code_hash as string, // For admin/debugging only
    expiresAt: rows[0].expires_at as string,
    createdAt: rows[0].created_at as string,
    attemptCount: rows[0].attempt_count as number,
    consumedAt: rows[0].consumed_at as string | null,
  };
}

/**
 * Clean up old OTP codes (housekeeping)
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const db = getDatabase();
  
  // Delete expired consumed codes
  const result = await db`
    DELETE FROM email_verification_codes 
    WHERE expires_at < datetime('now') AND consumed_at IS NOT NULL
  `;
  
  return result as number;
}