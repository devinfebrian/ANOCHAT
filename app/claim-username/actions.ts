"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, getServerProfile } from "@/lib/supabase/server";
import { createProfile } from "@/lib/profile/queries";

export type ClaimUsernameState = { ok: boolean; error?: string };

export async function claimUsername(
  _prev: ClaimUsernameState,
  formData: FormData,
): Promise<ClaimUsernameState> {
  const session = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || username;

  const result = await createProfile(session.id, username, displayName);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/events");
  redirect("/events");
}

export async function redirectToClaimIfMissingProfile(): Promise<void> {
  const profile = await getServerProfile();
  if (profile) redirect("/events");
}