import { and, eq, gt, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { createDbEventStore, type EventStore } from "./store";
import type { IntakeError, IntakeResult } from "./intake";

const WINDOW_MINUTES = 10;
const MAX_EVENTS = 3;

export const EVENT_CREATE_RATE_LIMIT = { WINDOW_MINUTES, MAX_EVENTS } as const;

function err<T>(error: IntakeError): IntakeResult<T> {
  return { ok: false, error };
}

export async function withEventCreateRateLimit<T>(
  userId: string,
  fn: (store: EventStore) => Promise<IntakeResult<T>>,
): Promise<IntakeResult<T>> {
  await connection();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('event_create_rate_limit', ${userId}))`,
    );

    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(eq(events.createdByUserId, userId), gt(events.createdAt, since)));

    if ((rows[0]?.count ?? 0) >= MAX_EVENTS) {
      return err({ type: "rate_limited" });
    }

    return fn(createDbEventStore(tx));
  });
}
