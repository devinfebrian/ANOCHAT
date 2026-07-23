import { db } from "@/lib/db";
import { getServerSession, getServerProfile } from "@/lib/supabase/server";
import type { EventUser } from "./intake";
import { createDbRateLimiter } from "./rate-limit";
import { createDbEventStore, type EventStore } from "./store";
import type { EventIntakeContext } from "./intake";

export async function createEventIntakeContext(): Promise<EventIntakeContext> {
  const [session, profile] = await Promise.all([getServerSession(), getServerProfile()]);
  const user: EventUser | null =
    session && profile
      ? { userId: profile.userId, username: profile.username }
      : null;

  return {
    user,
    now: new Date(),
    store: createDbEventStore(),
    rateLimit: createDbRateLimiter(),
    withStoreInTransaction: async <T>(fn: (store: EventStore) => Promise<T>) =>
      db.transaction(async (tx) => fn(createDbEventStore(tx))),
  };
}
