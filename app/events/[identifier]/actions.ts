"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eventAttendees } from "@/lib/db/schema";
import { rsvpStatusSchema } from "@/lib/events/schema";
import { getEventByIdentifier } from "@/lib/events/queries";
import { getServerUsername } from "@/lib/profile/server";

export type SetRsvpState = {
  ok: boolean;
  formError?: string;
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

  const event = await getEventByIdentifier(identifier);
  if (!event) {
    return { ok: false, formError: "Event not found." };
  }

  try {
    await db
      .insert(eventAttendees)
      .values({ eventId: event.id, username, status })
      .onConflictDoUpdate({
        target: [eventAttendees.eventId, eventAttendees.username],
        set: { status, joinedAt: new Date() },
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
