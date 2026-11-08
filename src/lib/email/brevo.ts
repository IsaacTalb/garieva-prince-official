import "server-only";

/**
 * Brevo Email Service - OTP Delivery for Custom Auth
 * 
 * This service handles 6-digit OTP email delivery using Brevo SMTP.
 * OTP codes are hashed before storage in D1 for security.
 */

type SendBrevoEmailInput = {
  to: { email: string; name?: string | null }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: number; // Not used - custom templates preferred
  params?: Record<string, unknown>; // For merge tags in templates
  tags?: string[]; // Customer tags for segmentation
};

type BrevoResponse = {
  messageId?: string;
  messageIds?: string[];
  statusCode: number;
};

/**
 * Configuration validation
 */
function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Garieva Prince";
  
  if (!apiKey || !senderEmail) {
    throw new Error("Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL.");
  }
  
  return { apiKey, senderEmail, senderName };
}

/**
 * Send OTP email via Brevo SMTP
 * 
 * Brevo sends a 6-digit code to verify customer email addresses.
 * This is part of the custom passwordless authentication flow.
 */
export async function sendOtpEmail({
  to,
  subject = "Your Garieva Prince Verification Code",
  htmlContent,
  textContent,
}: SendBrevoEmailInput & {
  to: { email: string; name?: string | null }[];
}) {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  // Brevo SMTP endpoint for transactional emails
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { 
        email: senderEmail, 
        name: senderName 
      },
      to,
      subject,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo email failed: ${errorText}`);
  }

  const body = (await response.json().catch(() => ({}))) as BrevoResponse;
  
  return body.messageId ?? body.messageIds?.[0] ?? "sent";
}

/**
 * Send OTP with HTML template
 */
export async function sendOtpWithTemplate({
  to,
  subject = "Your Garieva Prince Verification Code",
  code,
}: {
  to: { email: string; name?: string | null }[];
  subject?: string;
  code: string;
}): Promise<string> {
  const htmlContent = generateOtpHtml(code);
  
  return sendOtpEmail({
    to,
    subject,
    htmlContent,
    textContent: `Your Garieva Prince verification code is: ${code}`,
  });
}

/**
 * Generate OTP email HTML with styling
 */
function generateOtpHtml(code: string): string {
  const bgColor = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${bgColor}; padding: 30px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Garieva Prince</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Your Verification Code</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">We've sent you a verification code</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Please enter the following 6-digit code to complete your email verification:
              </p>
              
              <!-- Code Display -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #f0f4ff; border-radius: 8px; padding: 20px 40px;">
                  <span id="code" style="font-size: 32px; font-weight: bold; color: #764ba2; letter-spacing: 5px; font-family: 'Courier New', monospace;">${code}</span>
                </div>
              </div>
              
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                If you didn't request this verification, please ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 25px 30px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">© ${new Date().getFullYear()} Garieva Prince</p>
              <p style="margin: 0; color: #bbbbbb; font-size: 11px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send OTP SMS (placeholder for future implementation)
 */
export async function sendOtpSms({
  to,
  code,
}: {
  to: { phone: string; name?: string | null }[];
  code: string;
}): Promise<string> {
  throw new Error("SMS OTP not yet implemented - Brevo is email-only");
}