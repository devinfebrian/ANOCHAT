"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  claimUsername as claimUsernameIntake,
  type ProfileIntakeError,
} from "@/lib/profile/intake";
import { createProfileIntakeContext } from "@/lib/profile/server-context";
import { getServerProfile } from "@/lib/supabase/server";

export type ClaimUsernameState = { ok: boolean; error?: string };

function mapError(error: ProfileIntakeError): string {
  switch (error.type) {
    case "not_authenticated":
      return "Sign in to pick a username.";
    case "username_taken":
      return "That username is already taken.";
    case "invalid_username":
      return error.message;
    case "invalid_display_name":
      return error.message;
    case "form_error":
      return error.message;
    default:
      return "Could not claim username.";
  }
}

export async function claimUsername(
  _prev: ClaimUsernameState,
  formData: FormData,
): Promise<ClaimUsernameState> {
  const ctx = await createProfileIntakeContext();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || username;

  const result = await claimUsernameIntake({ username, displayName }, ctx);
  if (!result.ok) {
    return { ok: false, error: mapError(result.error) };
  }

  revalidatePath("/events");
  redirect("/events");
}

export async function redirectToClaimIfMissingProfile(): Promise<void> {
  const profile = await getServerProfile();
  if (profile) redirect("/events");
}
