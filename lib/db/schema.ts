import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { USERNAME_PATTERN } from "@/lib/profile/schema";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    activityType: text("activity_type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    locationText: text("location_text").notNull(),
    mapUrl: text("map_url"),
    maxParticipants: integer("max_participants").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    managementTokenHash: text("management_token_hash"),
  },
  (t) => [
    uniqueIndex("events_slug_idx").on(t.slug),
    index("events_starts_at_idx").on(t.startsAt),
    check("events_max_participants_range", sql`${t.maxParticipants} BETWEEN 2 AND 100`),
    check("events_activity_type_valid", sql`${t.activityType} IN ('hangout','sport','food','study','game','outdoor','travel','other')`),
    check("events_title_length", sql`char_length(${t.title}) BETWEEN 1 AND 120`),
    check("events_location_text_length", sql`char_length(${t.locationText}) BETWEEN 1 AND 200`),
    check("events_description_length", sql`char_length(coalesce(${t.description}, '')) <= 1000`),
    check("events_map_url_length", sql`char_length(coalesce(${t.mapUrl}, '')) <= 500`),
    check(
      "events_created_by_format",
      sql`char_length(${t.createdBy}) BETWEEN 3 AND 20 AND ${t.createdBy} ~ ${sql.raw(`'${USERNAME_PATTERN.source}'`)}`,
    ),
  ],
);

export const eventAttendees = pgTable(
  "event_attendees",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    status: text("status").notNull().$type<RsvpStatus>(),
    note: text("note"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.username] }),
    index("event_attendees_username_idx").on(t.username),
    check("event_attendees_status_valid", sql`${t.status} IN ('joining','interested','declined')`),
    check("event_attendees_note_length", sql`char_length(coalesce(${t.note}, '')) <= 120`),
    check(
      "event_attendees_username_format",
      sql`char_length(${t.username}) BETWEEN 3 AND 20 AND ${t.username} ~ ${sql.raw(`'${USERNAME_PATTERN.source}'`)}`,
    ),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type NewEventAttendee = typeof eventAttendees.$inferInsert;

export const REPORT_TARGET_TYPES = ["event"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ["open", "reviewed", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull().$type<ReportTargetType>(),
    targetId: uuid("target_id").notNull(),
    reporterUsername: text("reporter_username").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().$type<ReportStatus>().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_target_idx").on(t.targetType, t.targetId),
    index("reports_status_idx").on(t.status),
    check("reports_target_type_valid", sql`${t.targetType} IN ('event')`),
    check("reports_status_valid", sql`${t.status} IN ('open','reviewed','dismissed')`),
    check("reports_reason_length", sql`char_length(${t.reason}) BETWEEN 1 AND 280`),
    check(
      "reports_reporter_username_format",
      sql`char_length(${t.reporterUsername}) BETWEEN 3 AND 20 AND ${t.reporterUsername} ~ ${sql.raw(`'${USERNAME_PATTERN.source}'`)}`,
    ),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export const ACTIVITY_TYPES = [
  "hangout",
  "sport",
  "food",
  "study",
  "game",
  "outdoor",
  "travel",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const RSVP_STATUSES = ["joining", "interested", "declined"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
