"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eventAttendees, events } from "@/lib/db/schema";
import { eventFormSchema, eventFormValuesFromFormData } from "@/lib/events/schema";
import { zonedTimeToUtc } from "@/lib/events/time";
import {
  generateManagementToken,
  hashManagementToken,
  setManagerCookie,
} from "@/lib/events/management";
import { getServerUsername } from "@/lib/profile/server";

export type CreateEventState = {
  ok: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
};

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

  const rawToken = generateManagementToken();
  const tokenHash = hashManagementToken(rawToken);

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
          managementTokenHash: tokenHash,
        })
        .returning({ id: events.id, slug: events.slug });
      await tx
        .insert(eventAttendees)
        .values({ eventId: event.id, username: createdBy, status: "joining" });
      return event;
    });

    await setManagerCookie(inserted.slug, rawToken);

    revalidatePath("/events");
    redirect(`/events/${inserted.slug}`);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "45000") {
      return { ok: false, formError: "Event is full." };
    }
    throw error;
  }

  return { ok: true };
}
