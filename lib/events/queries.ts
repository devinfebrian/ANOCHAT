import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { eventAttendees, events, type Event, type EventAttendee, type RsvpStatus } from "@/lib/db/schema";

export type EventListItem = Omit<Event, "cancelledAt" | "managementTokenHash"> & { attendeesCount: number };
export type EventDetail = Event & { attendeesCount: number };

export type EventCursor = { startsAt: Date; id: string };
export type EventListPage = { items: EventListItem[]; nextCursor: EventCursor | null };

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const LIST_PAGE_SIZE = 20;

export function parseCursor(raw: string | undefined): EventCursor | undefined {
  if (!raw) return undefined;
  const sep = raw.lastIndexOf("|");
  if (sep < 0) return undefined;
  const iso = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  const startsAt = new Date(iso);
  if (Number.isNaN(startsAt.getTime()) || !UUID_RE.test(id)) return undefined;
  return { startsAt, id };
}

export function encodeCursor(c: EventCursor): string {
  return `${c.startsAt.toISOString()}|${c.id}`;
}

export const getEventByIdentifier = cache(async function getEventByIdentifier(
  identifier: string,
): Promise<EventDetail | null> {
  await connection();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      activityType: events.activityType,
      startsAt: events.startsAt,
      locationText: events.locationText,
      mapUrl: events.mapUrl,
      maxParticipants: events.maxParticipants,
      description: events.description,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      cancelledAt: events.cancelledAt,
      managementTokenHash: events.managementTokenHash,
      attendeesCount: sql<number>`(
        SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id} AND a.status = 'joining'
      )`.as("attendees_count"),
    })
    .from(events)
    .where(eq(UUID_RE.test(identifier) ? events.id : events.slug, identifier))
    .limit(1);
  return rows[0] ?? null;
});

export async function listEventAttendees(eventId: string): Promise<EventAttendee[]> {
  await connection();
  return db
    .select()
    .from(eventAttendees)
    .where(eq(eventAttendees.eventId, eventId))
    .orderBy(asc(eventAttendees.joinedAt));
}

export async function listUpcomingEvents(
  cursor?: EventCursor,
  take = LIST_PAGE_SIZE,
  now: Date = new Date(),
): Promise<EventListPage> {
  await connection();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      activityType: events.activityType,
      startsAt: events.startsAt,
      locationText: events.locationText,
      mapUrl: events.mapUrl,
      maxParticipants: events.maxParticipants,
      description: events.description,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      attendeesCount: sql<number>`(
        SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id} AND a.status = 'joining'
      )`.as("attendees_count"),
    })
    .from(events)
    .where(
      and(
        gt(events.startsAt, now),
        isNull(events.cancelledAt),
        cursor
          ? or(gt(events.startsAt, cursor.startsAt), and(eq(events.startsAt, cursor.startsAt), gt(events.id, cursor.id)))
          : undefined,
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(take + 1);

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? { startsAt: items[items.length - 1].startsAt, id: items[items.length - 1].id } : null;
  return { items, nextCursor };
}

export const isEventPast = cache(async function isEventPast(startsAt: Date): Promise<boolean> {
  await connection();
  return startsAt.getTime() <= Date.now();
});

export async function listPastEvents(
  cursor?: EventCursor,
  take = LIST_PAGE_SIZE,
  now: Date = new Date(),
): Promise<EventListPage> {
  await connection();
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      activityType: events.activityType,
      startsAt: events.startsAt,
      locationText: events.locationText,
      mapUrl: events.mapUrl,
      maxParticipants: events.maxParticipants,
      description: events.description,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      attendeesCount: sql<number>`(
        SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id} AND a.status = 'joining'
      )`.as("attendees_count"),
    })
    .from(events)
    .where(
      and(
        lt(events.startsAt, now),
        isNull(events.cancelledAt),
        cursor
          ? or(lt(events.startsAt, cursor.startsAt), and(eq(events.startsAt, cursor.startsAt), lt(events.id, cursor.id)))
          : undefined,
      ),
    )
    .orderBy(desc(events.startsAt), desc(events.id))
    .limit(take + 1);

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? { startsAt: items[items.length - 1].startsAt, id: items[items.length - 1].id } : null;
  return { items, nextCursor };
}

export type RsvpCounts = { joining: number; interested: number; declined: number };

export async function getRsvpCounts(eventId: string): Promise<RsvpCounts> {
  await connection();
  const rows = await db
    .select({ status: eventAttendees.status, count: sql<number>`count(*)::int` })
    .from(eventAttendees)
    .where(eq(eventAttendees.eventId, eventId))
    .groupBy(eventAttendees.status);
  const counts: RsvpCounts = { joining: 0, interested: 0, declined: 0 };
  for (const row of rows) {
    if (row.status === "joining" || row.status === "interested" || row.status === "declined") {
      counts[row.status] = row.count;
    }
  }
  return counts;
}

export async function getUserRsvp(
  eventId: string,
  username: string,
): Promise<{ status: RsvpStatus; note: string | null } | null> {
  await connection();
  const rows = await db
    .select({ status: eventAttendees.status, note: eventAttendees.note })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.username, username)))
    .limit(1);
  return rows[0] ?? null;
}
