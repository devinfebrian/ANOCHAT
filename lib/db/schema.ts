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
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type NewEventAttendee = typeof eventAttendees.$inferInsert;

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
