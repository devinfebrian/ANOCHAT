import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // cookies().set is read-only in Server Components; safe to ignore.
          // Session refresh is handled by the proxy on the next request.
        }
      },
    },
  });
}

export const getServerSupabase = cache(createServerSupabase);

export type SessionUser = { id: string; email: string | null };

export const getServerSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
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
  // Reuse the looked-up profile but keep type aligned with the session id.
  if (profile.userId !== session.id) redirect("/claim-username");
  return profile;
}

export function createServiceSupabase() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}