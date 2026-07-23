"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppUrl } from "@/lib/auth/origin";
import { safeRedirect } from "@/lib/auth/redirect";

const emailSchema = z.string().email("Invalid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

export type LoginState = { ok: boolean; error?: string; message?: string };

export async function signInWithEmail(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));

  if (!email.success) return { ok: false, error: email.error.issues[0]?.message ?? "Invalid email." };
  if (!password.success) return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password." };

  const redirectTo = safeRedirect(String(formData.get("redirectTo") ?? ""));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });

  if (error) return { ok: false, error: "Invalid email or password." };

  redirect(redirectTo || "/events");
}

export async function signUpWithEmail(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));

  if (!email.success) return { ok: false, error: email.error.issues[0]?.message ?? "Invalid email." };
  if (!password.success) return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password." };

  const origin = getAppUrl();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) return { ok: false, error: error.message };

  if (data.session) {
    redirect("/claim-username");
  }

  return { ok: true, message: "Check your email for a confirmation link." };
}
