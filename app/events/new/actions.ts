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

  const { createdBy, mapUrl, description, startsAt, ...rest } = parsed.data;
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
          startsAt: new Date(startsAt),
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
    if (error instanceof Error && /is full/.test(error.message)) {
      return { ok: false, formError: "Event is full." };
    }
    throw error;
  }

  return { ok: true };
}
