import type { RsvpStatus } from "@/lib/db/schema";
import { reportSchema, type ReportValues } from "@/lib/reports/schema";
import type { EventStore } from "./store";
import type { EditEventValues, EventFormValues } from "./schema";
import { zonedTimeToUtc } from "./time";

export type EventUser = { userId: string; username: string };

export type EventIntakeContext = {
  user: EventUser | null;
  now: Date;
  store: EventStore;
  rateLimit: {
    withEventCreate: <T>(
      userId: string,
      fn: (store: EventStore) => Promise<IntakeResult<T>>,
    ) => Promise<IntakeResult<T>>;
    withReport: <T>(
      userId: string,
      fn: (store: EventStore) => Promise<IntakeResult<T>>,
    ) => Promise<IntakeResult<T>>;
  };
  withStoreInTransaction: <T>(fn: (store: EventStore) => Promise<T>) => Promise<T>;
};

export type IntakeError =
  | { type: "not_authenticated" }
  | { type: "rate_limited" }
  | { type: "event_not_found" }
  | { type: "event_cancelled" }
  | { type: "not_manager" }
  | { type: "validation_error"; fieldErrors: Partial<Record<string, string[]>> }
  | { type: "form_error"; message: string }
  | { type: "event_full" }
  | { type: "already_reported" };

export type IntakeResult<T> = { ok: true; value: T } | { ok: false; error: IntakeError };

function ok<T>(value: T): IntakeResult<T> {
  return { ok: true, value };
}

function err<T>(error: IntakeError): IntakeResult<T> {
  return { ok: false, error };
}

function generateSlug(title: string): string {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event"}-${Date.now().toString(36)}`;
}

function isDbError(error: unknown, code: string): boolean {
  const errCode =
    (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
  return errCode === code;
}

export async function createEvent(
  input: EventFormValues,
  ctx: EventIntakeContext,
): Promise<IntakeResult<{ slug: string }>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  return ctx.rateLimit.withEventCreate(ctx.user.userId, async (store) => {
    const { mapUrl, description, startsAt, timezone, ...rest } = input;
    const startsAtUtc = zonedTimeToUtc(startsAt, timezone);
    if (startsAtUtc.getTime() <= ctx.now.getTime()) {
      return err({
        type: "validation_error",
        fieldErrors: { startsAt: ["Date and time must be in the future"] },
      });
    }

    const slug = generateSlug(rest.title);

    try {
      const event = await store.insertEvent({
        ...rest,
        mapUrl: mapUrl || null,
        description: description || null,
        startsAt: startsAtUtc,
        createdBy: ctx.user!.username,
        createdByUserId: ctx.user!.userId,
        slug,
      });
      await store.insertRsvp({
        eventId: event.id,
        username: ctx.user!.username,
        status: "joining",
        note: null,
        userId: ctx.user!.userId,
      });

      return ok({ slug: event.slug });
    } catch (error) {
      if (isDbError(error, "45000")) {
        return err({ type: "event_full" });
      }
      throw error;
    }
  });
}

export async function editEvent(
  identifier: string,
  input: EditEventValues,
  ctx: EventIntakeContext,
): Promise<IntakeResult<{ slug: string }>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventForManagement(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }
  if (event.createdByUserId !== ctx.user.userId) {
    return err({ type: "not_manager" });
  }

  const { mapUrl, description, startsAt, timezone, ...rest } = input;
  const startsAtUtc = zonedTimeToUtc(startsAt, timezone);
  if (startsAtUtc.getTime() <= ctx.now.getTime()) {
    return err({
      type: "validation_error",
      fieldErrors: { startsAt: ["Date and time must be in the future"] },
    });
  }
  if (rest.maxParticipants < event.attendeesCount) {
    return err({
      type: "validation_error",
      fieldErrors: {
        maxParticipants: [
          `Capacity cannot be lower than current attendees (${event.attendeesCount})`,
        ],
      },
    });
  }

  const updated = await ctx.store.updateEvent(event.id, {
    ...rest,
    mapUrl: mapUrl || null,
    description: description || null,
    startsAt: startsAtUtc,
  });
  if (!updated) {
    return err({ type: "event_cancelled" });
  }

  return ok({ slug: event.slug });
}

export async function cancelEvent(
  identifier: string,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventForManagement(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }
  if (event.createdByUserId !== ctx.user.userId) {
    return err({ type: "not_manager" });
  }

  const updated = await ctx.store.cancelEvent(event.id);
  if (!updated) {
    return err({ type: "event_cancelled" });
  }

  return ok(undefined);
}

export type SetRsvpInput = { status: RsvpStatus; note: string | null };

export async function setRsvp(
  identifier: string,
  input: SetRsvpInput,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventByIdentifier(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }
  if (event.startsAt.getTime() <= ctx.now.getTime() && input.status !== "declined") {
    return err({ type: "form_error", message: "Event has already started. RSVP closed." });
  }

  try {
    await ctx.withStoreInTransaction(async (tx) => {
      const existing = await tx.findRsvpForUpdate(event.id, ctx.user!.userId);
      if (!existing) {
        await tx.insertRsvp({
          eventId: event.id,
          username: ctx.user!.username,
          status: input.status,
          note: input.note,
          userId: ctx.user!.userId,
        });
        return;
      }

      const statusChanged = existing.status !== input.status;
      await tx.updateRsvp(event.id, ctx.user!.userId, {
        status: input.status,
        note: input.note,
        statusChanged,
      });
    });
  } catch (error) {
    if (isDbError(error, "23505")) {
      return err({ type: "form_error", message: "You already have an RSVP for this event." });
    }
    if (isDbError(error, "45000")) {
      return err({ type: "event_full" });
    }
    throw error;
  }

  return ok(undefined);
}

export async function removeRsvp(
  identifier: string,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventByIdentifier(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }
  if (event.startsAt.getTime() <= ctx.now.getTime()) {
    return err({ type: "form_error", message: "Event has already started. RSVP closed." });
  }

  await ctx.store.deleteRsvpByUser(event.id, ctx.user.userId);
  return ok(undefined);
}

export async function reportEvent(
  identifier: string,
  reason: string,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user) {
    return err({ type: "not_authenticated" });
  }

  return ctx.rateLimit.withReport(ctx.user.userId, async (store) => {
    const event = await store.findEventForManagement(identifier);
    if (!event) {
      return err({ type: "event_not_found" });
    }
    if (event.createdByUserId === ctx.user!.userId) {
      return err({ type: "form_error", message: "You can't report your own event." });
    }
    if (event.cancelledAt) {
      return err({ type: "event_cancelled" });
    }

    const parsed = reportSchema.safeParse({
      targetType: "event",
      targetId: event.id,
      reporterUsername: ctx.user!.username,
      reason,
    });

    if (!parsed.success) {
      return err({
        type: "validation_error",
        fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
      });
    }

    const data: ReportValues = parsed.data;

    try {
      await store.insertReport({
        targetType: data.targetType,
        targetId: data.targetId,
        reporterUsername: data.reporterUsername,
        reporterUserId: ctx.user!.userId,
        reason: data.reason,
      });
    } catch (error) {
      if (isDbError(error, "23505")) {
        return err({ type: "already_reported" });
      }
      throw error;
    }

    return ok(undefined);
  });
}