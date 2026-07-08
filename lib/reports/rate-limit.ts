import { and, eq, gt, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { reports, type ReportTargetType } from "@/lib/db/schema";
import { createDbEventStore, type EventStore } from "@/lib/events/store";
import type { IntakeError, IntakeResult } from "@/lib/events/intake";

const WINDOW_MINUTES = 10;
const MAX_REPORTS = 5;

export const REPORT_RATE_LIMIT = { WINDOW_MINUTES, MAX_REPORTS } as const;

function err<T>(error: IntakeError): IntakeResult<T> {
  return { ok: false, error };
}

export async function withReportRateLimit<T>(
  userId: string,
  targetType: ReportTargetType,
  fn: (store: EventStore) => Promise<IntakeResult<T>>,
): Promise<IntakeResult<T>> {
  await connection();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('report_rate_limit', ${userId} || ':' || ${targetType}))`,
    );

    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(
        and(
          eq(reports.reporterUserId, userId),
          eq(reports.targetType, targetType),
          gt(reports.createdAt, since),
        ),
      );

    if ((rows[0]?.count ?? 0) >= MAX_REPORTS) {
      return err({ type: "rate_limited" });
    }

    return fn(createDbEventStore(tx));
  });
}
