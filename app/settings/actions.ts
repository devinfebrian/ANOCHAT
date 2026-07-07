"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { renameUsername, updateProfile } from "@/lib/profile/queries";
import { profileLinksSchema, usernameSchema, displayNameSchema, bioSchema } from "@/lib/profile/schema";

export type SettingsState = { ok: boolean; error?: string; message?: string };

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const labels = (formData.getAll("linkLabel") ?? []).map((v) => String(v));
  const urls = (formData.getAll("linkUrl") ?? []).map((v) => String(v));
  const links = labels
    .map((label, i) => ({ label: label.trim(), url: urls[i]?.trim() ?? "" }))
    .filter((l) => l.label.length > 0 || l.url.length > 0);

  try {
    await updateProfile(profile.userId, {
      displayName,
      bio: bio.length > 0 ? bio : null,
      links,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save profile." };
  }

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/settings");
  return { ok: true, message: "Profile saved." };
}

export async function renameUsernameAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();
  const newName = String(formData.get("username") ?? "").trim();

  const result = await renameUsername(profile, newName);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/u/${result.profile.username}`);
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/settings");
  redirect(`/settings`);
}

export async function uploadAvatarAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Image must be under 2 MB." };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { ok: false, error: "Image must be JPEG, PNG, or WebP." };
  }

  const supabase = await getServerSupabase();
  const path = `${profile.userId}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false, error: "Could not retrieve avatar URL." };
  }

  // Cache-bust the public URL so the new image shows immediately.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  try {
    await updateProfile(profile.userId, { avatarUrl });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save avatar." };
  }

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/settings");
  return { ok: true, message: "Avatar updated." };
}

