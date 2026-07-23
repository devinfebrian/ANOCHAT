import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { createDbEventStore, type EventStore } from "./store";
import type { IntakeError, IntakeResult } from "./intake";

const WINDOW_MINUTES = 10;
const MAX_EVENTS = 3;
const MAX_REPORTS = 5;

export const EVENT_CREATE_RATE_LIMIT = { WINDOW_MINUTES, MAX_EVENTS } as const;
export const REPORT_RATE_LIMIT = { WINDOW_MINUTES, MAX_REPORTS } as const;

function err<T>(error: IntakeError): IntakeResult<T> {
  return { ok: false, error };
}

export interface RateLimiter {
  withEventCreate<T>(
    userId: string,
    fn: (store: EventStore) => Promise<IntakeResult<T>>,
  ): Promise<IntakeResult<T>>;
  withReport<T>(
    userId: string,
    fn: (store: EventStore) => Promise<IntakeResult<T>>,
  ): Promise<IntakeResult<T>>;
}

function sinceWindow(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

export function createDbRateLimiter(): RateLimiter {
  return {
    async withEventCreate<T>(
      userId: string,
      fn: (store: EventStore) => Promise<IntakeResult<T>>,
    ): Promise<IntakeResult<T>> {
      await connection();
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended('event_create_rate_limit:' || ${userId}, 0))`,
        );
        const txStore = createDbEventStore(tx);
        const count = await txStore.countEventsCreatedByUserSince(userId, sinceWindow());
        if (count >= MAX_EVENTS) {
          return err({ type: "rate_limited" });
        }
        return fn(txStore);
      });
    },

    async withReport<T>(
      userId: string,
      fn: (store: EventStore) => Promise<IntakeResult<T>>,
    ): Promise<IntakeResult<T>> {
      await connection();
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended('report_rate_limit:' || ${userId} || ':event', 0))`,
        );
        const txStore = createDbEventStore(tx);
        const count = await txStore.countReportsByUserSince(userId, "event", sinceWindow());
        if (count >= MAX_REPORTS) {
          return err({ type: "rate_limited" });
        }
        return fn(txStore);
      });
    },
  };
}
