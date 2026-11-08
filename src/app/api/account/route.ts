import { AccessError, requireUser } from "@/lib/auth/session";
import { ConfigurationError } from "@/lib/config";

export async function GET() {
  try {
    const user = await requireUser();
    // Deliberately exclude provider subject, email, phone, and unrelated fields.
    return Response.json({ user: { id: user.id, displayName: user.display_name, profileVisibility: user.profile_visibility } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : error instanceof ConfigurationError ? 503 : 500;
    return Response.json({ error: status === 401 ? "Sign in is required." : "Account is temporarily unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
