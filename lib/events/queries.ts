import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { eventAttendees, events, type Event } from "@/lib/db/schema";

export type EventListItem = Event & { attendeesCount: number };

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
    .orderBy(events.startsAt);

  return rows;
}
