import "server-only";

type SendBrevoEmailInput = {
  to: { email: string; name?: string | null }[];
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  tags?: string[];
};

type BrevoResponse = {
  messageId?: string;
  messageIds?: string[];
};

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Garieva Prince";
  if (!apiKey || !senderEmail) throw new Error("Brevo is not configured.");
  return { apiKey, senderEmail, senderName };
}

export async function sendTransactionalEmail(input: SendBrevoEmailInput) {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  if (!input.templateId && !input.subject) {
    throw new Error("subject is required when templateId is not provided");
  }
  if (!input.templateId && !input.htmlContent && !input.textContent) {
    throw new Error("email content is required when templateId is not provided");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: input.to,
      ...(input.templateId ? { templateId: input.templateId } : {}),
      ...(input.subject ? { subject: input.subject } : {}),
      ...(input.htmlContent ? { htmlContent: input.htmlContent } : {}),
      ...(input.textContent ? { textContent: input.textContent } : {}),
      ...(input.params ? { params: input.params } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
    }),
  });

  const body = (await response.json().catch(() => ({}))) as BrevoResponse & { message?: string };
  if (!response.ok) throw new Error(body.message ?? `Brevo request failed with status ${response.status}`);
  return body;
}
