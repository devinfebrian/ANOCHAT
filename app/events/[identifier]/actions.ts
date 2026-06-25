"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventAttendees, events } from "@/lib/db/schema";
import {
  editEventSchema,
  eventFormValuesFromFormData,
  rsvpNoteSchema,
  rsvpStatusSchema,
} from "@/lib/events/schema";
import { zonedTimeToUtc } from "@/lib/events/time";
import { getEventByIdentifier } from "@/lib/events/queries";
import { clearManagerCookie, verifyEventManager } from "@/lib/events/management";
import { getServerUsername } from "@/lib/profile/server";

export type SetRsvpState = {
  ok: boolean;
  formError?: string;
  noteError?: string;
};

export async function setRsvp(
  _prev: SetRsvpState,
  formData: FormData,
): Promise<SetRsvpState> {
  const username = await getServerUsername();
  if (!username) {
    return { ok: false, formError: "Set a username before RSVPing." };
  }

  const identifier = String(formData.get("identifier") ?? "");
  const statusParsed = rsvpStatusSchema.safeParse(String(formData.get("status") ?? ""));
  if (!statusParsed.success || !identifier) {
    return { ok: false, formError: "Pick a valid RSVP status." };
  }
  const status = statusParsed.data;

  const noteParsed = rsvpNoteSchema.safeParse(String(formData.get("note") ?? ""));
  if (!noteParsed.success) {
    return { ok: false, noteError: noteParsed.error.issues[0]?.message };
  }
  const note = noteParsed.data && noteParsed.data.trim() ? noteParsed.data.trim() : null;

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }
  if (event.cancelledAt) {
    return { ok: false, formError: "This event has been cancelled." };
  }

  try {
    await db
      .insert(eventAttendees)
      .values({ eventId: event.id, username, status, note })
      .onConflictDoUpdate({
        target: [eventAttendees.eventId, eventAttendees.username],
        set: { status, joinedAt: new Date(), note },
      });
  } catch (error) {
    const code =
      (error as { code?: string })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "45000") {
      return { ok: false, formError: "Event is full." };
    }
    throw error;
  }

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  return { ok: true };
}

export type EditEventState = {
  ok: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
};

export async function editEvent(
  _prev: EditEventState,
  formData: FormData,
): Promise<EditEventState> {
  const username = await getServerUsername();
  if (!username) {
    return { ok: false, formError: "Set a username before editing an event." };
  }

  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }
  if (event.cancelledAt) {
    return { ok: false, formError: "Cancelled events can't be edited." };
  }
  const allowed = await verifyEventManager(event);
  if (!allowed) {
    return { ok: false, formError: "Only the creator can edit this event." };
  }

  const parsed = editEventSchema.safeParse(eventFormValuesFromFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { mapUrl, description, startsAt, timezone, ...rest } = parsed.data;
  const startsAtUtc = zonedTimeToUtc(startsAt, timezone);
  if (startsAtUtc.getTime() <= Date.now()) {
    return { ok: false, fieldErrors: { startsAt: ["Date and time must be in the future"] } };
  }

  const updated = await db
    .update(events)
    .set({
      title: rest.title,
      activityType: rest.activityType,
      startsAt: startsAtUtc,
      locationText: rest.locationText,
      mapUrl: mapUrl || null,
      maxParticipants: rest.maxParticipants,
      description: description || null,
    })
    .where(and(eq(events.id, event.id), isNull(events.cancelledAt)))
    .returning({ id: events.id });

  if (updated.length === 0) {
    return { ok: false, formError: "Cancelled events can't be edited." };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/events/${event.slug}/edit`);
  return { ok: true };
}

export type CancelEventState = {
  ok: boolean;
  formError?: string;
};

export async function cancelEvent(
  _prev: CancelEventState,
  formData: FormData,
): Promise<CancelEventState> {
  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }
  if (event.cancelledAt) {
    return { ok: false, formError: "Event is already cancelled." };
  }
  const allowed = await verifyEventManager(event);
  if (!allowed) {
    return { ok: false, formError: "Only the creator can cancel this event." };
  }

  const updated = await db
    .update(events)
    .set({ cancelledAt: new Date() })
    .where(and(eq(events.id, event.id), isNull(events.cancelledAt)))
    .returning({ id: events.id });

  if (updated.length === 0) {
    return { ok: false, formError: "Event is already cancelled." };
  }

  await clearManagerCookie(event.slug);

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/events/${event.slug}/edit`);
  return { ok: true };
}