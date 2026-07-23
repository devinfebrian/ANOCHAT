import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, events, eventAttendees } from "@/lib/db/schema";

const SETUP_DDL = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS "profiles" (
    "user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "username" text NOT NULL,
    "display_name" text NOT NULL,
    "bio" text,
    "avatar_url" text,
    "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "last_seen" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_unique" ON "profiles" ("username")`,
  `CREATE TABLE IF NOT EXISTS "username_reservations" (
    "username" text PRIMARY KEY NOT NULL,
    "reserved_until" timestamptz NOT NULL,
    "reserved_by" uuid
  )`,
  `CREATE TABLE IF NOT EXISTS "events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "slug" text NOT NULL,
    "activity_type" text NOT NULL,
    "starts_at" timestamptz NOT NULL,
    "location_text" text NOT NULL,
    "map_url" text,
    "max_participants" integer NOT NULL,
    "description" text,
    "created_by" text NOT NULL,
    "created_by_user_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "cancelled_at" timestamptz
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_idx" ON "events" ("slug")`,
  `CREATE TABLE IF NOT EXISTS "event_attendees" (
    "event_id" uuid NOT NULL,
    "username" text NOT NULL,
    "status" text NOT NULL,
    "note" text,
    "joined_at" timestamptz DEFAULT now() NOT NULL,
    "user_id" uuid NOT NULL,
    CONSTRAINT "event_attendees_event_id_username_pk" PRIMARY KEY("event_id","username")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "event_attendees_event_user_active_unique"
    ON "event_attendees" ("event_id","user_id") WHERE "event_attendees"."status" <> 'declined'`,
  `CREATE TABLE IF NOT EXISTS "reports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "target_type" text NOT NULL,
    "target_id" uuid NOT NULL,
    "reporter_username" text NOT NULL,
    "reporter_user_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "status" text DEFAULT 'open' NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "reports_target_reporter_unique"
    ON "reports" ("target_id","reporter_user_id")`,
];

export async function setupSchema(): Promise<void> {
  for (const statement of SETUP_DDL) {
    await db.execute(sql.raw(statement));
  }
}

export async function resetTables(): Promise<void> {
  await db.execute(
    sql.raw(
      `TRUNCATE TABLE "reports", "event_attendees", "events", "username_reservations", "profiles" CASCADE`,
    ),
  );
}

export type TestProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export async function seedProfile(input: TestProfile): Promise<void> {
  await db.execute(
    sql`INSERT INTO "profiles" ("user_id", "username", "display_name", "bio", "avatar_url")
        VALUES (${input.userId}, ${input.username}, ${input.displayName}, ${input.bio ?? null}, ${input.avatarUrl ?? null})`,
  );
}

export async function seedEvent(
  createdByUserId: string,
  createdByUsername: string,
  slug: string,
): Promise<string> {
  const row = await db.execute(
    sql`INSERT INTO "events" ("title", "slug", "activity_type", "starts_at", "location_text", "max_participants", "created_by", "created_by_user_id")
        VALUES ('Test Event', ${slug}, 'hangout', now() + interval '1 day', 'Park', 4, ${createdByUsername}, ${createdByUserId})
        RETURNING "id"`,
  );
  return (row[0] as { id: string }).id;
}

export async function seedAttendee(
  eventId: string,
  userId: string,
  username: string,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO "event_attendees" ("event_id", "username", "status", "user_id")
        VALUES (${eventId}, ${username}, 'joining', ${userId})`,
  );
}

export async function seedReport(
  reporterUserId: string,
  reporterUsername: string,
  targetId: string,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO "reports" ("target_type", "target_id", "reporter_username", "reporter_user_id", "reason")
        VALUES ('event', ${targetId}, ${reporterUsername}, ${reporterUserId}, 'spam')`,
  );
}

export async function getProfileByUsername(username: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function getEventCreatedBy(username: string) {
  return db.select({ id: events.id, createdBy: events.createdBy }).from(events).where(eq(events.createdBy, username));
}

export async function getAttendeeUsername(username: string) {
  const rows = await db.select({ username: eventAttendees.username }).from(eventAttendees).where(eq(eventAttendees.username, username)).limit(1);
  return rows[0] ?? null;
}

// a helper function to get the report for a specific target and reporter
export async function getReport(targetId: string, reporterUserId: string) {
  const rows = await db.select().from("reports").where(eq("target_id", targetId)).and(eq("reporter_user_id", reporterUserId)).limit(1);
  return rows[0] ?? null;
}