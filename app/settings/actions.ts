"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/server";
import { getServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { renameUsername, updateProfile } from "@/lib/profile/queries";


export type SettingsState = { ok: boolean; error?: string; message?: string };

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

export type SignedUploadState =
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; error: string };

export async function getAvatarUploadUrlAction(): Promise<SignedUploadState> {
  const profile = await requireProfile();
  const supabase = createServiceSupabase();
  const path = `${profile.userId}/avatar`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? "Could not create upload URL." };
  }

  return { ok: true, signedUrl: data.signedUrl, path: data.path };
}

export async function saveAvatarUrlAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();
  const path = String(formData.get("path") ?? "").trim();
  const expectedPath = `${profile.userId}/avatar`;

  if (path !== expectedPath) {
    return { ok: false, error: "Invalid avatar path." };
  }

  const supabase = await getServerSupabase();
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
