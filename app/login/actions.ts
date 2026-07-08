"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/auth/origin";
import { safeRedirect } from "@/lib/auth/redirect";
import { getServerSupabase } from "@/lib/supabase/server";

export type RequestMagicLinkState = {
  ok: boolean;
  error?: string;
  email?: string;
};

export async function requestMagicLink(
  _prev: RequestMagicLinkState,
  formData: FormData,
): Promise<RequestMagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  const redirectTo = safeRedirect(String(formData.get("redirect") ?? ""));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", email };
  }

  const confirmUrl = new URL("/auth/confirm", getAppUrl());
  confirmUrl.searchParams.set("redirect", redirectTo);

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: confirmUrl.toString(), shouldCreateUser: true },
  });

  if (error) {
    return { ok: false, error: error.message, email };
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
}