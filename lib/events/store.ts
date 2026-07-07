import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  eventAttendees,
  events,
  reports,
  type Event,
  type EventAttendee,
  type NewEvent,
  type NewEventAttendee,
  type NewReport,
  type RsvpStatus,
} from "@/lib/db/schema";

export type EventPublic = Omit<Event, "createdByUserId"> & {
  attendeesCount: number;
};

export type EventForManagement = Event & { attendeesCount: number };

export type EventCursor = { startsAt: Date; id: string };
export type EventListPage = { items: EventPublic[]; nextCursor: EventCursor | null };

export type RsvpCounts = { joining: number; interested: number; declined: number };

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const LIST_PAGE_SIZE = 20;

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | TransactionClient;

export interface EventStore {
  findEventByIdentifier(identifier: string): Promise<EventPublic | null>;
  findEventForManagement(identifier: string): Promise<EventForManagement | null>;
  listUpcomingEvents(cursor?: EventCursor, now?: Date): Promise<EventListPage>;
  listPastEvents(cursor?: EventCursor, now?: Date): Promise<EventListPage>;
  listEventsCreatedByUser(userId: string): Promise<EventPublic[]>;
  listEventAttendees(eventId: string): Promise<EventAttendee[]>;
  getRsvpCounts(eventId: string): Promise<RsvpCounts>;
  getUserRsvp(eventId: string, userId: string): Promise<{ status: RsvpStatus; note: string | null } | null>;

  insertEvent(event: NewEvent): Promise<{ id: string; slug: string }>;
  updateEvent(id: string, data: Partial<Omit<NewEvent, "id" | "createdAt" | "createdBy" | "createdByUserId">>): Promise<{ id: string } | null>;
  cancelEvent(id: string): Promise<{ id: string } | null>;

  findRsvpForUpdate(eventId: string, userId: string): Promise<{ status: RsvpStatus } | null>;
  insertRsvp(attendee: NewEventAttendee): Promise<void>;
  updateRsvp(
    eventId: string,
    userId: string,
    data: Partial<EventAttendee> & { statusChanged: boolean },
  ): Promise<void>;
  deleteRsvpByUser(eventId: string, userId: string): Promise<void>;

  insertReport(report: NewReport): Promise<void>;
}

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

const attendeesCountSubquery = sql<number>`(
  SELECT count(*)::int FROM ${eventAttendees} a WHERE a.event_id = ${events.id} AND a.status = 'joining'
)`.as("attendees_count");

const publicEventColumns = {
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
  attendeesCount: attendeesCountSubquery,
};

const managementEventColumns = {
  ...publicEventColumns,
  createdByUserId: events.createdByUserId,
};

export function createDbEventStore(client: DbClient = db): EventStore {
  return {
    async findEventByIdentifier(identifier: string): Promise<EventPublic | null> {
      await connection();
      const rows = await client
        .select(publicEventColumns)
        .from(events)
        .where(eq(UUID_RE.test(identifier) ? events.id : events.slug, identifier))
        .limit(1);
      return rows[0] ?? null;
    },

    async findEventForManagement(identifier: string): Promise<EventForManagement | null> {
      await connection();
      const rows = await client
        .select(managementEventColumns)
        .from(events)
        .where(eq(UUID_RE.test(identifier) ? events.id : events.slug, identifier))
        .limit(1);
      return rows[0] ?? null;
    },

    async listUpcomingEvents(cursor?: EventCursor, now: Date = new Date()): Promise<EventListPage> {
      await connection();
      const rows = await client
        .select(publicEventColumns)
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
        .limit(LIST_PAGE_SIZE + 1);

      const hasMore = rows.length > LIST_PAGE_SIZE;
      const items = hasMore ? rows.slice(0, LIST_PAGE_SIZE) : rows;
      const nextCursor = hasMore ? { startsAt: items[items.length - 1].startsAt, id: items[items.length - 1].id } : null;
      return { items, nextCursor };
    },

    async listPastEvents(cursor?: EventCursor, now: Date = new Date()): Promise<EventListPage> {
      await connection();
      const rows = await client
        .select(publicEventColumns)
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
        .limit(LIST_PAGE_SIZE + 1);

      const hasMore = rows.length > LIST_PAGE_SIZE;
      const items = hasMore ? rows.slice(0, LIST_PAGE_SIZE) : rows;
      const nextCursor = hasMore ? { startsAt: items[items.length - 1].startsAt, id: items[items.length - 1].id } : null;
      return { items, nextCursor };
    },

    async listEventsCreatedByUser(userId: string): Promise<EventPublic[]> {
      await connection();
      return client
        .select(publicEventColumns)
        .from(events)
        .where(and(eq(events.createdByUserId, userId), isNull(events.cancelledAt)))
        .orderBy(desc(events.startsAt))
        .limit(50);
    },

    async listEventAttendees(eventId: string): Promise<EventAttendee[]> {
      await connection();
      return client
        .select()
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, eventId))
        .orderBy(asc(eventAttendees.joinedAt));
    },

    async getRsvpCounts(eventId: string): Promise<RsvpCounts> {
      await connection();
      const rows = await client
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
    },

    async getUserRsvp(
      eventId: string,
      userId: string,
    ): Promise<{ status: RsvpStatus; note: string | null } | null> {
      await connection();
      const rows = await client
        .select({ status: eventAttendees.status, note: eventAttendees.note })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
        .limit(1);
      return rows[0] ?? null;
    },

    async insertEvent(event: NewEvent): Promise<{ id: string; slug: string }> {
      const [inserted] = await client
        .insert(events)
        .values(event)
        .returning({ id: events.id, slug: events.slug });
      return inserted!;
    },

    async updateEvent(
      id: string,
      data: Partial<Omit<NewEvent, "id" | "createdAt" | "createdBy" | "createdByUserId">>,
    ): Promise<{ id: string } | null> {
      const rows = await client
        .update(events)
        .set(data)
        .where(and(eq(events.id, id), isNull(events.cancelledAt)))
        .returning({ id: events.id });
      return rows[0] ?? null;
    },

    async cancelEvent(id: string): Promise<{ id: string } | null> {
      const rows = await client
        .update(events)
        .set({ cancelledAt: new Date() })
        .where(and(eq(events.id, id), isNull(events.cancelledAt)))
        .returning({ id: events.id });
      return rows[0] ?? null;
    },

    async findRsvpForUpdate(
      eventId: string,
      userId: string,
    ): Promise<{ status: RsvpStatus } | null> {
      const rows = await client
        .select({ status: eventAttendees.status })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
        .for("update")
        .limit(1);
      return rows[0] ?? null;
    },

    async insertRsvp(attendee: NewEventAttendee): Promise<void> {
      await client.insert(eventAttendees).values(attendee);
    },

    async updateRsvp(
      eventId: string,
      userId: string,
      data: Partial<EventAttendee> & { statusChanged: boolean },
    ): Promise<void> {
      const { statusChanged, ...rest } = data;
      const update: Partial<EventAttendee> = { ...rest };
      if (statusChanged) {
        update.joinedAt = new Date();
      }
      await client
        .update(eventAttendees)
        .set(update)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    },

    async deleteRsvpByUser(eventId: string, userId: string): Promise<void> {
      await client
        .delete(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    },

    async insertReport(report: NewReport): Promise<void> {
      await client.insert(reports).values(report);
    },
  };
}