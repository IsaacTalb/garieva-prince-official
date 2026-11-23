import { AccountNavigation } from "@/components/account/account-navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { profileSchema } from "@/schemas/user";

export const metadata = { title: "Profile settings" };

export default async function AccountProfilePage() {
  const user = await requirePageUser();
  const profile = profileSchema.parse({
    display_name: user.display_name ?? "",
    username: user.username,
    phone: user.phone,
    bio: user.bio,
    instagram_url: user.instagram_url,
    facebook_url: user.facebook_url,
    tiktok_url: user.tiktok_url,
    telegram_url: user.telegram_url,
    show_profile_publicly: user.show_profile_publicly,
    show_wardrobe_publicly: user.show_wardrobe_publicly,
    show_avatar_publicly: user.show_avatar_publicly,
    show_instagram: user.show_instagram,
    show_facebook: user.show_facebook,
    show_tiktok: user.show_tiktok,
    show_telegram: user.show_telegram,
  });

  return (
    <>
      <PageIntro eyebrow="Your account" title="Profile settings">
        <p>Manage your personal details and what others can see.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="profile" />
        <section className="content-card">
          <h2>Personal details</h2>
          <ProfileForm initialProfile={profile} />
        </section>
      </section>
    </>
  );
}
