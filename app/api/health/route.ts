import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute("SELECT 1");
    return Response.json({
      status: "ok",
      db: "ok",
      ms: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    const detail =
      env.NODE_ENV === "production"
        ? "db_unreachable"
        : error instanceof Error
          ? error.message
          : String(error);
    return Response.json(
      { status: "degraded", db: "error", error: detail, ts: new Date().toISOString() },
      { status: 503 },
    );
  }
}