import { and, eq, gt, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

const WINDOW_MINUTES = 10;
const MAX_EVENTS = 3;

export const EVENT_CREATE_RATE_LIMIT = { WINDOW_MINUTES, MAX_EVENTS } as const;

export async function checkEventCreateRateLimit(userId: string): Promise<boolean> {
  await connection();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.createdByUserId, userId), gt(events.createdAt, since)));
  return (rows[0]?.count ?? 0) < MAX_EVENTS;
}