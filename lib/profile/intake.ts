import type { Profile } from "@/lib/db/schema";
import type { ProfileStore } from "./store";

export type ProfileUser = { userId: string };

export type ProfileIntakeContext = {
  user: ProfileUser | null;
  profile: Profile | null;
  now: Date;
  store: ProfileStore;
};

export type ProfileIntakeError =
  | { type: "not_authenticated" }
  | { type: "profile_not_found" }
  | { type: "username_taken" }
  | { type: "invalid_username"; message: string }
  | { type: "invalid_display_name"; message: string }
  | { type: "invalid_avatar_path" }
  | { type: "form_error"; message: string };

export type ProfileIntakeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProfileIntakeError };

function ok<T>(value: T): ProfileIntakeResult<T> {
  return { ok: true, value };
}

function err<T>(error: ProfileIntakeError): ProfileIntakeResult<T> {
  return { ok: false, error };
}

function mapError(error: unknown): ProfileIntakeResult<never> {
  if (error instanceof Error) {
    const message = error.message;
    if (message === "That username is already taken.") {
      return err({ type: "username_taken" });
    }
    if (message.startsWith("Username") || message.startsWith("Invalid username")) {
      return err({ type: "invalid_username", message });
    }
    if (message.startsWith("Display name") || message.startsWith("Invalid display name")) {
      return err({ type: "invalid_display_name", message });
    }
    if (message === "Profile not found") {
      return err({ type: "profile_not_found" });
    }
    return err({ type: "form_error", message });
  }
  return err({ type: "form_error", message: "Something went wrong." });
}

export type ClaimUsernameInput = {
  username: string;
  displayName?: string;
};

export async function claimUsername(
  input: ClaimUsernameInput,
  ctx: ProfileIntakeContext,
): Promise<ProfileIntakeResult<Profile>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  const displayName = input.displayName?.trim() || input.username;

  try {
    const profile = await ctx.store.createProfile({
      userId: ctx.user.userId,
      username: input.username,
      displayName,
    });
    return ok(profile);
  } catch (error) {
    return mapError(error);
  }
}

export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
  links?: { label: string; url: string }[];
};

export async function updateProfile(
  input: UpdateProfileInput,
  ctx: ProfileIntakeContext,
): Promise<ProfileIntakeResult<Profile>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }
  if (!ctx.profile) {
    return err({ type: "profile_not_found" });
  }

  try {
    const profile = await ctx.store.updateProfile(ctx.profile.userId, {
      displayName: input.displayName,
      bio: input.bio?.trim() || null,
      links: input.links,
    });
    return ok(profile);
  } catch (error) {
    return mapError(error);
  }
}

export async function renameUsername(
  newName: string,
  ctx: ProfileIntakeContext,
): Promise<ProfileIntakeResult<Profile>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }
  if (!ctx.profile) {
    return err({ type: "profile_not_found" });
  }

  try {
    const profile = await ctx.store.renameUsername(ctx.profile, newName);
    return ok(profile);
  } catch (error) {
    return mapError(error);
  }
}

export type AvatarUpload = { signedUrl: string; path: string };

export async function prepareAvatarUpload(
  ctx: ProfileIntakeContext,
): Promise<ProfileIntakeResult<AvatarUpload>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }
  if (!ctx.profile) {
    return err({ type: "profile_not_found" });
  }

  try {
    const upload = await ctx.store.createSignedAvatarUploadUrl(ctx.profile.userId);
    return ok(upload);
  } catch (error) {
    return mapError(error);
  }
}

export async function saveAvatarUrl(
  path: string,
  ctx: ProfileIntakeContext,
): Promise<ProfileIntakeResult<Profile>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }
  if (!ctx.profile) {
    return err({ type: "profile_not_found" });
  }

  const expectedPath = ctx.store.getAvatarUploadPath(ctx.profile.userId);
  if (path !== expectedPath) {
    return err({ type: "invalid_avatar_path" });
  }

  try {
    const avatarUrl = await ctx.store.getAvatarPublicUrl(path);
    const profile = await ctx.store.updateProfile(ctx.profile.userId, { avatarUrl });
    return ok(profile);
  } catch (error) {
    return mapError(error);
  }
}
