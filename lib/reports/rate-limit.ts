import { and, eq, gt, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import type { ReportTargetType } from "@/lib/db/schema";

const WINDOW_MINUTES = 10;
const MAX_REPORTS = 5;

export const REPORT_RATE_LIMIT = { WINDOW_MINUTES, MAX_REPORTS } as const;

export async function checkReportRateLimit(
  userId: string,
  targetType: ReportTargetType,
): Promise<boolean> {
  await connection();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.reporterUserId, userId),
        eq(reports.targetType, targetType),
        gt(reports.createdAt, since),
      ),
    );
  return (rows[0]?.count ?? 0) < MAX_REPORTS;
}