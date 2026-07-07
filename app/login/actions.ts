"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  const redirectTo = String(formData.get("redirect") ?? "").trim() || "/events";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", email };
  }

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost").split(",")[0].trim();
  const origin = `${proto}://${host}`;
  const confirmUrl = new URL("/auth/confirm", origin);
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