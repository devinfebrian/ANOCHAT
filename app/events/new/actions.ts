"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eventAttendees, events } from "@/lib/db/schema";
import { eventFormSchema, eventFormValuesFromFormData } from "@/lib/events/schema";
import { getServerUsername } from "@/lib/profile/server";

export type CreateEventState = {
  ok: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
};

function zonedTimeToUtc(isoLocal: string, timeZone: string): Date {
  const asIfUtc = new Date(`${isoLocal}Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(asIfUtc).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  const asZoneUtc = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  );
  const offsetMs = asZoneUtc.getTime() - asIfUtc.getTime();
  return new Date(asIfUtc.getTime() - offsetMs);
}

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const username = await getServerUsername();
  if (!username) {
    return {
      ok: false,
      formError: "Set a username before creating an event.",
    };
  }

  const raw = { ...eventFormValuesFromFormData(formData), createdBy: username };
  const parsed = eventFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { createdBy, mapUrl, description, startsAt, timezone, ...rest } = parsed.data;
  const startsAtUtc = zonedTimeToUtc(startsAt, timezone);
  if (startsAtUtc.getTime() <= Date.now()) {
    return {
      ok: false,
      fieldErrors: { startsAt: ["Date and time must be in the future"] },
    };
  }

  const slug = `${rest.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event"}-${Date.now().toString(36)}`;

  try {
    const inserted = await db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          title: rest.title,
          slug,
          activityType: rest.activityType,
          startsAt: startsAtUtc,
          locationText: rest.locationText,
          mapUrl: mapUrl || null,
          maxParticipants: rest.maxParticipants,
          description: description || null,
          createdBy,
        })
        .returning({ id: events.id });
      await tx
        .insert(eventAttendees)
        .values({ eventId: event.id, username: createdBy });
      return event;
    });

    revalidatePath("/events");
    redirect(`/events/${inserted.id}`);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "45000") {
      return { ok: false, formError: "Event is full." };
    }
    throw error;
  }

  return { ok: true };
}
