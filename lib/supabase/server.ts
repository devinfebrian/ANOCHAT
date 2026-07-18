import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

export type SessionUser = { id: string; email: string | null };

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
  });
}

export const getServerSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
});

export const getServerProfile = cache(async (): Promise<Profile | null> => {
  const session = await getServerSession();
  if (!session) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.id))
    .limit(1);
  return rows[0] ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireProfile(): Promise<Profile> {
  const session = await requireUser();
  const profile = await getServerProfile();
  if (!profile) redirect("/claim-username");
  if (profile.userId !== session.id) redirect("/claim-username");
  return profile;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  const allowed =
    env.ADMIN_USER_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];
  if (!allowed.includes(session.id)) redirect("/events");
  return session;
}

export function createServiceSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
