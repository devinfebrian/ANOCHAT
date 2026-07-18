import { getServerSession, getServerProfile } from "@/lib/supabase/server";
import { createDbProfileStore } from "./store";
import type { ProfileIntakeContext } from "./intake";

export async function createProfileIntakeContext(): Promise<ProfileIntakeContext> {
  const [session, profile] = await Promise.all([getServerSession(), getServerProfile()]);

  return {
    user: session ? { userId: session.id } : null,
    profile,
    now: new Date(),
    store: createDbProfileStore(),
  };
}
