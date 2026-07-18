import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

export type SessionUser = { id: string; email: string | null };

export const getServerSession = cache(async (): Promise<SessionUser | null> => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const email =
    typeof sessionClaims?.email === "string" ? sessionClaims.email : null;
  return { id: userId, email };
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
  const allowed = env.ADMIN_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  if (!allowed.includes(session.id)) redirect("/events");
  return session;
}

export function createServiceSupabase() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
