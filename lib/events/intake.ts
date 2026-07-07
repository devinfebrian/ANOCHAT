import { timingSafeEqual } from "node:crypto";
import type { RsvpStatus } from "@/lib/db/schema";
import type { Username } from "@/lib/profile/schema";
import { reportSchema, type ReportValues } from "@/lib/reports/schema";
import { generateManagementToken, hashManagementToken } from "./management";
import type { EventForManagement, EventStore } from "./store";
import type { EditEventValues, EventFormValues } from "./schema";
import { zonedTimeToUtc } from "./time";

export type EventIntakeContext = {
  user: Username | null;
  deviceHash: string | null;
  now: Date;
  store: EventStore;
  managerCookie: {
    rawToken: string | null;
    set: (slug: string, rawToken: string) => Promise<void>;
    clear: (slug: string) => Promise<void>;
  };
  rateLimit: {
    checkEventCreate: (deviceHash: string) => Promise<boolean>;
    checkReport: (deviceHash: string) => Promise<boolean>;
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
  | { type: "already_reported" }
  | { type: "username_device_mismatch"; message: string };

export type IntakeResult<T> = { ok: true; value: T } | { ok: false; error: IntakeError };

function ok<T>(value: T): IntakeResult<T> {
  return { ok: true, value };
}

function err<T>(error: IntakeError): IntakeResult<T> {
  return { ok: false, error };
}

class RsvpDeviceMismatchError extends Error {}

function generateSlug(title: string): string {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event"}-${Date.now().toString(36)}`;
}

function verifyManager(event: EventForManagement, user: Username, rawToken: string | null): boolean {
  if (!rawToken) return false;
  if (user !== event.createdBy) return false;
  if (!event.managementTokenHash) return false;
  const submitted = Buffer.from(hashManagementToken(rawToken), "hex");
  const stored = Buffer.from(event.managementTokenHash, "hex");
  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
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
  if (!ctx.user || !ctx.deviceHash) {
    return err({ type: "not_authenticated" });
  }

  const allowed = await ctx.rateLimit.checkEventCreate(ctx.deviceHash);
  if (!allowed) {
    return err({ type: "rate_limited" });
  }

  const { createdBy, mapUrl, description, startsAt, timezone, ...rest } = input;
  const startsAtUtc = zonedTimeToUtc(startsAt, timezone);
  if (startsAtUtc.getTime() <= ctx.now.getTime()) {
    return err({
      type: "validation_error",
      fieldErrors: { startsAt: ["Date and time must be in the future"] },
    });
  }

  const slug = generateSlug(rest.title);
  const rawToken = generateManagementToken();
  const tokenHash = hashManagementToken(rawToken);

  try {
    const event = await ctx.withStoreInTransaction(async (tx) => {
      const inserted = await tx.insertEvent({
        ...rest,
        mapUrl: mapUrl || null,
        description: description || null,
        startsAt: startsAtUtc,
        createdBy,
        slug,
        managementTokenHash: tokenHash,
        creatorDeviceHash: ctx.deviceHash!,
      });
      await tx.insertRsvp({
        eventId: inserted.id,
        username: createdBy,
        status: "joining",
        note: null,
        deviceHash: ctx.deviceHash!,
      });
      return inserted;
    });

    await ctx.managerCookie.set(event.slug, rawToken);
    return ok({ slug: event.slug });
  } catch (error) {
    if (isDbError(error, "45000")) {
      return err({ type: "event_full" });
    }
    throw error;
  }
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
  if (!verifyManager(event, ctx.user, ctx.managerCookie.rawToken)) {
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
  if (!verifyManager(event, ctx.user, ctx.managerCookie.rawToken)) {
    return err({ type: "not_manager" });
  }

  const updated = await ctx.store.cancelEvent(event.id);
  if (!updated) {
    return err({ type: "event_cancelled" });
  }

  await ctx.managerCookie.clear(event.slug);
  return ok(undefined);
}

export type SetRsvpInput = { status: RsvpStatus; note: string | null };

export async function setRsvp(
  identifier: string,
  input: SetRsvpInput,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user || !ctx.deviceHash) {
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
      const existing = await tx.findRsvpForUpdate(event.id, ctx.user!);
      if (!existing) {
        await tx.insertRsvp({
          eventId: event.id,
          username: ctx.user!,
          status: input.status,
          note: input.note,
          deviceHash: ctx.deviceHash!,
        });
        return;
      }

      if (existing.deviceHash !== ctx.deviceHash) {
        throw new RsvpDeviceMismatchError(
          "That username is already in use on another device. Pick a different name.",
        );
      }

      const statusChanged = existing.status !== input.status;
      await tx.updateRsvp(event.id, ctx.user!, {
        status: input.status,
        note: input.note,
        deviceHash: ctx.deviceHash,
        statusChanged,
      });
    });
  } catch (error) {
    if (error instanceof RsvpDeviceMismatchError) {
      return err({ type: "username_device_mismatch", message: error.message });
    }
    if (isDbError(error, "23505")) {
      return err({
        type: "username_device_mismatch",
        message: "That username is already in use on another device. Pick a different name.",
      });
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
  if (!ctx.user || !ctx.deviceHash) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventByIdentifier(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }

  await ctx.store.deleteRsvpByDevice(event.id, ctx.deviceHash);
  return ok(undefined);
}

export async function reportEvent(
  identifier: string,
  reason: string,
  ctx: EventIntakeContext,
): Promise<IntakeResult<void>> {
  if (!ctx.user || !ctx.deviceHash) {
    return err({ type: "not_authenticated" });
  }

  const event = await ctx.store.findEventByIdentifier(identifier);
  if (!event) {
    return err({ type: "event_not_found" });
  }
  if (ctx.user === event.createdBy) {
    return err({ type: "form_error", message: "You can't report your own event." });
  }
  if (event.cancelledAt) {
    return err({ type: "event_cancelled" });
  }

  const allowed = await ctx.rateLimit.checkReport(ctx.deviceHash);
  if (!allowed) {
    return err({ type: "rate_limited" });
  }

  const parsed = reportSchema.safeParse({
    targetType: "event",
    targetId: event.id,
    reporterUsername: ctx.user,
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
    await ctx.store.insertReport({
      targetType: data.targetType,
      targetId: data.targetId,
      reporterUsername: data.reporterUsername,
      reporterDeviceHash: ctx.deviceHash,
      reason: data.reason,
    });
  } catch (error) {
    if (isDbError(error, "23505")) {
      return err({ type: "already_reported" });
    }
    throw error;
  }

  return ok(undefined);
}
