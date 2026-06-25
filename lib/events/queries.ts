import { asc, eq, gt, sql } from "drizzle-orm";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { eventAttendees, events, type Event, type EventAttendee } from "@/lib/db/schema";

export type EventListItem = Event & { attendeesCount: number };
export type EventDetail = Event & { attendeesCount: number };

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
      attendeesCount: sql<number>`(
        SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id}
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

export async function listUpcomingEvents(): Promise<EventListItem[]> {
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
        SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id}
      )`.as("attendees_count"),
    })
    .from(events)
    .where(gt(events.startsAt, new Date()))
    .orderBy(events.startsAt);

  return rows;
}
