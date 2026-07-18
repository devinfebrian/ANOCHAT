import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { USERNAME_PATTERN } from "@/lib/profile/schema";

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

export type LinkEntry = { label: string; url: string };

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    links: jsonb("links").$type<LinkEntry[]>().notNull().default(sql`'[]'::jsonb`),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_username_unique").on(t.username),
    index("profiles_created_at_idx").on(t.createdAt),
    check(
      "profiles_username_format",
      sql`char_length(${t.username}) BETWEEN 3 AND 20 AND ${t.username} ~ ${sql.raw(`'${USERNAME_PATTERN.source}'`)}`,
    ),
    check(
      "profiles_display_name_length",
      sql`char_length(${t.displayName}) BETWEEN 2 AND 20`,
    ),
    check("profiles_bio_length", sql`char_length(coalesce(${t.bio}, '')) <= 500`),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export const usernameReservations = pgTable(
  "username_reservations",
  {
    username: text("username").primaryKey(),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    reservedBy: text("reserved_by").references(() => profiles.userId, {
      onDelete: "set null",
    }),
  },
  (t) => [index("username_reservations_reserved_until_idx").on(t.reservedUntil)],
);

export type UsernameReservation = typeof usernameReservations.$inferSelect;

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    activityType: text("activity_type").notNull().$type<ActivityType>(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    locationText: text("location_text").notNull(),
    mapUrl: text("map_url"),
    maxParticipants: integer("max_participants").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("events_slug_idx").on(t.slug),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_created_by_user_id_idx").on(t.createdByUserId),
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

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

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
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.username] }),
    index("event_attendees_username_idx").on(t.username),
    index("event_attendees_user_id_idx").on(t.userId),
    uniqueIndex("event_attendees_event_user_active_unique")
      .on(t.eventId, t.userId)
      .where(sql`${t.status} <> 'declined'`),
    check("event_attendees_status_valid", sql`${t.status} IN ('joining','interested','declined')`),
    check("event_attendees_note_length", sql`char_length(coalesce(${t.note}, '')) <= 120`),
    check(
      "event_attendees_username_format",
      sql`char_length(${t.username}) BETWEEN 3 AND 20 AND ${t.username} ~ ${sql.raw(`'${USERNAME_PATTERN.source}'`)}`,
    ),
  ],
);

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
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").notNull().$type<ReportStatus>().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_reporter_user_id_idx").on(t.reporterUserId),
    uniqueIndex("reports_target_reporter_unique").on(t.targetId, t.reporterUserId),
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