"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  updateProfile as updateProfileIntake,
  renameUsername as renameUsernameIntake,
  prepareAvatarUpload,
  saveAvatarUrl,
  type ProfileIntakeError,
} from "@/lib/profile/intake";
import { createProfileIntakeContext } from "@/lib/profile/server-context";

export type SettingsState = { ok: boolean; error?: string; message?: string };

function mapError(error: ProfileIntakeError): string {
  switch (error.type) {
    case "not_authenticated":
      return "Pick a username before updating your profile.";
    case "profile_not_found":
      return "Profile not found.";
    case "username_taken":
      return "That username is already taken.";
    case "invalid_username":
      return error.message;
    case "invalid_display_name":
      return error.message;
    case "invalid_avatar_path":
      return "Invalid avatar path.";
    case "form_error":
      return error.message;
  }
}

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await createProfileIntakeContext();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const labels = (formData.getAll("linkLabel") ?? []).map((v) => String(v));
  const urls = (formData.getAll("linkUrl") ?? []).map((v) => String(v));
  const links = labels
    .map((label, i) => ({ label: label.trim(), url: urls[i]?.trim() ?? "" }))
    .filter((l) => l.label.length > 0 || l.url.length > 0);

  const result = await updateProfileIntake({ displayName, bio, links }, ctx);
  if (!result.ok) {
    return { ok: false, error: mapError(result.error) };
  }

  revalidatePath(`/u/${result.value.username}`);
  revalidatePath("/settings");
  return { ok: true, message: "Profile saved." };
}

export async function renameUsernameAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await createProfileIntakeContext();
  const newName = String(formData.get("username") ?? "").trim();

  const result = await renameUsernameIntake(newName, ctx);
  if (!result.ok) {
    return { ok: false, error: mapError(result.error) };
  }

  revalidatePath(`/u/${result.value.username}`);
  if (ctx.profile && ctx.profile.username !== result.value.username) {
    revalidatePath(`/u/${ctx.profile.username}`);
  }
  revalidatePath("/settings");
  redirect(`/settings`);
}

export type SignedUploadState =
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; error: string };

export async function getAvatarUploadUrlAction(): Promise<SignedUploadState> {
  const ctx = await createProfileIntakeContext();

  const result = await prepareAvatarUpload(ctx);
  if (!result.ok) {
    return { ok: false, error: mapError(result.error) };
  }

  return { ok: true, signedUrl: result.value.signedUrl, path: result.value.path };
}

export async function saveAvatarUrlAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await createProfileIntakeContext();
  const path = String(formData.get("path") ?? "").trim();

  const result = await saveAvatarUrl(path, ctx);
  if (!result.ok) {
    return { ok: false, error: mapError(result.error) };
  }

  revalidatePath(`/u/${result.value.username}`);
  revalidatePath("/settings");
  return { ok: true, message: "Avatar updated." };
}
