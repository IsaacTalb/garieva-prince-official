"use client";

import { useState, type FormEvent } from "react";
import { profileSchema, type ProfileInput } from "@/schemas/user";

const socialFields = [
  { urlKey: "instagram_url", visibilityKey: "show_instagram", label: "Instagram" },
  { urlKey: "facebook_url", visibilityKey: "show_facebook", label: "Facebook" },
  { urlKey: "tiktok_url", visibilityKey: "show_tiktok", label: "TikTok" },
  { urlKey: "telegram_url", visibilityKey: "show_telegram", label: "Telegram" },
] as const;

export function ProfileForm({ initialProfile }: { initialProfile: ProfileInput }) {
  const [profile, setProfile] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      ...profile,
      username: profile.username?.trim() || null,
      phone: profile.phone?.trim() || null,
      bio: profile.bio?.trim() || null,
      instagram_url: profile.instagram_url?.trim() || null,
      facebook_url: profile.facebook_url?.trim() || null,
      tiktok_url: profile.tiktok_url?.trim() || null,
      telegram_url: profile.telegram_url?.trim() || null,
    };
    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      setSaving(false);
      setMessage("Please check your display name, username, and social links.");
      return;
    }

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Your profile could not be saved.");
        return;
      }
      setProfile(parsed.data);
      setMessage("Your profile has been saved.");
    } catch {
      setMessage("Your profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <label>
        Display name
        <input
          autoComplete="name"
          maxLength={100}
          required
          value={profile.display_name}
          onChange={(event) => update("display_name", event.currentTarget.value)}
        />
      </label>
      <label>
        Username
        <input
          autoComplete="username"
          maxLength={30}
          value={profile.username ?? ""}
          onChange={(event) => update("username", event.currentTarget.value)}
        />
        <span className="form-hint">Use 3-30 lowercase letters, numbers, or underscores.</span>
      </label>
      <label>
        Phone
        <input
          autoComplete="tel"
          maxLength={30}
          value={profile.phone ?? ""}
          onChange={(event) => update("phone", event.currentTarget.value)}
        />
      </label>
      <label>
        Bio
        <textarea
          maxLength={500}
          rows={4}
          value={profile.bio ?? ""}
          onChange={(event) => update("bio", event.currentTarget.value)}
        />
      </label>

      <fieldset>
        <legend>Social links</legend>
        {socialFields.map(({ urlKey, visibilityKey, label }) => {
          return (
            <div className="social-profile-field" key={urlKey}>
              <label>
                {label} URL
                <input
                  type="url"
                  value={profile[urlKey] ?? ""}
                  onChange={(event) => update(urlKey, event.currentTarget.value)}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={profile[visibilityKey]}
                  onChange={(event) => update(visibilityKey, event.currentTarget.checked)}
                />
                Show {label} on public profile
              </label>
            </div>
          );
        })}
      </fieldset>

      <fieldset>
        <legend>Profile visibility</legend>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={profile.show_profile_publicly}
            onChange={(event) => update("show_profile_publicly", event.currentTarget.checked)}
          />
          Make my profile public
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={profile.show_avatar_publicly}
            onChange={(event) => update("show_avatar_publicly", event.currentTarget.checked)}
          />
          Show my avatar publicly
        </label>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="primary-link" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
        <p role="status" aria-live="polite">{message}</p>
      </div>
    </form>
  );
}
