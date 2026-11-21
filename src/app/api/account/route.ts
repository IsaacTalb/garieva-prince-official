import { AccessError, requireUser } from "@/lib/auth/session";
import { ConfigurationError } from "@/lib/config";
import { profileSchema } from "@/schemas/user";
import { updateUserProfile } from "@/lib/db/d1/users";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = {
      display_name: user.display_name ?? "",
      username: user.username,
      phone: user.phone,
      bio: user.bio,
      instagram_url: user.instagram_url,
      facebook_url: user.facebook_url,
      tiktok_url: user.tiktok_url,
      telegram_url: user.telegram_url,
      show_profile_publicly: user.show_profile_publicly,
      show_avatar_publicly: user.show_avatar_publicly,
      show_instagram: user.show_instagram,
      show_facebook: user.show_facebook,
      show_tiktok: user.show_tiktok,
      show_telegram: user.show_telegram,
    };
    return Response.json(
      { user: { id: user.id, email: user.email }, profile },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const status = error instanceof AccessError ? error.status : error instanceof ConfigurationError ? 503 : 500;
    if (status === 500) console.error("Account profile read failed:", error);
    return Response.json(
      { error: status === 401 ? "Sign in is required." : "Account is temporarily unavailable." },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Please review the profile fields and try again." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const updatedUser = await updateUserProfile(user.id, parsed.data);
    if (!updatedUser) {
      return Response.json(
        { error: "Account not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof AccessError ? error.status : error instanceof ConfigurationError ? 503 : 500;
    if (status === 500) console.error("Account profile update failed:", error);
    return Response.json(
      { error: status === 401 ? "Sign in is required." : "Account is temporarily unavailable." },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
