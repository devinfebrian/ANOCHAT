"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventAttendees, events, reports } from "@/lib/db/schema";
import {
  editEventSchema,
  eventFormValuesFromFormData,
  rsvpNoteSchema,
  rsvpStatusSchema,
} from "@/lib/events/schema";
import { reportSchema } from "@/lib/reports/schema";
import { checkReportRateLimit } from "@/lib/reports/rate-limit";
import { zonedTimeToUtc } from "@/lib/events/time";
import { getEventByIdentifier } from "@/lib/events/queries";
import { clearManagerCookie, verifyEventManager } from "@/lib/events/management";
import { getServerUsername } from "@/lib/profile/server";
import { getOrCreateDeviceId } from "@/lib/profile/device";

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
  if (event.startsAt.getTime() <= Date.now() && status !== "declined") {
    return { ok: false, formError: "Event has already started. RSVP closed." };
  }

  const { hash: deviceHash } = await getOrCreateDeviceId();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          status: eventAttendees.status,
          deviceHash: eventAttendees.deviceHash,
        })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, event.id),
            eq(eventAttendees.username, username),
          ),
        )
        .for("update")
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(eventAttendees).values({
          eventId: event.id,
          username,
          status,
          note,
          deviceHash,
        });
        return;
      }

      const row = existing[0];
      if (row.deviceHash !== deviceHash) {
        throw new RsvpError(
          "That username is already in use on another device. Pick a different name.",
        );
      }

      const statusChanged = row.status !== status;
      const update: {
        status: typeof status;
        note: typeof note;
        deviceHash: string;
        joinedAt?: Date;
      } = {
        status,
        note,
        deviceHash,
      };
      if (statusChanged) {
        update.joinedAt = new Date();
      }
      await tx
        .update(eventAttendees)
        .set(update)
        .where(
          and(
            eq(eventAttendees.eventId, event.id),
            eq(eventAttendees.username, username),
          ),
        );
    });
  } catch (error) {
    if (error instanceof RsvpError) {
      return { ok: false, formError: error.message };
    }
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

class RsvpError extends Error {}

export type RemoveRsvpState = {
  ok: boolean;
  formError?: string;
};

export async function removeRsvp(
  _prev: RemoveRsvpState,
  formData: FormData,
): Promise<RemoveRsvpState> {
  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }
  if (event.cancelledAt) {
    return { ok: false, formError: "Cancelled events are read-only." };
  }

  const { hash: deviceHash } = await getOrCreateDeviceId();
  await db
    .delete(eventAttendees)
    .where(
      and(
        eq(eventAttendees.eventId, event.id),
        eq(eventAttendees.deviceHash, deviceHash),
      ),
    );

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

export type ReportEventState = {
  ok: boolean;
  formError?: string;
  reasonError?: string;
};

export async function reportEvent(
  _prev: ReportEventState,
  formData: FormData,
): Promise<ReportEventState> {
  const username = await getServerUsername();
  if (!username) {
    return { ok: false, formError: "Set a username before reporting." };
  }

  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }

  if (username === event.createdBy) {
    return { ok: false, formError: "You can't report your own event." };
  }
  if (event.cancelledAt) {
    return { ok: false, formError: "This event has been cancelled." };
  }

  const { hash: deviceHash } = await getOrCreateDeviceId();

  const allowed = await checkReportRateLimit(deviceHash, "event");
  if (!allowed) {
    return {
      ok: false,
      formError: "Too many reports submitted. Try again in a few minutes.",
    };
  }

  const parsed = reportSchema.safeParse({
    targetType: "event",
    targetId: event.id,
    reporterUsername: username,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) {
    const reasonIssue = parsed.error.issues.find((i) => i.path[0] === "reason");
    return {
      ok: false,
      reasonError: reasonIssue?.message,
      formError: reasonIssue ? undefined : parsed.error.issues[0]?.message,
    };
  }

  try {
    await db.insert(reports).values({
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reporterUsername: parsed.data.reporterUsername,
      reporterDeviceHash: deviceHash,
      reason: parsed.data.reason,
    });
  } catch (error) {
    const code =
      (error as { code?: string })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      return { ok: false, formError: "You've already reported this event." };
    }
    throw error;
  }

  return { ok: true };
}
