"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eventFormSchema, eventFormValuesFromFormData } from "@/lib/events/schema";
import { createEvent as createEventIntake, type IntakeError } from "@/lib/events/intake";
import { createEventIntakeContext } from "@/lib/events/server-context";

export type CreateEventState = {
  ok: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
};

function mapError(error: IntakeError): CreateEventState {
  switch (error.type) {
    case "not_authenticated":
      return { ok: false, formError: "Pick a username before creating an event." };
    case "rate_limited":
      return { ok: false, formError: "Too many events created. Try again in a few minutes." };
    case "validation_error":
      return { ok: false, fieldErrors: error.fieldErrors };
    case "event_full":
      return { ok: false, formError: "Event is full." };
    default:
      return { ok: false, formError: "Could not create event." };
  }
}

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const ctx = await createEventIntakeContext();
  if (!ctx.user) {
    return { ok: false, formError: "Pick a username before creating an event." };
  }

  const raw = eventFormValuesFromFormData(formData);
  const parsed = eventFormSchema.safeParse({ ...raw, createdBy: ctx.user.username });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await createEventIntake(parsed.data, ctx);
  if (!result.ok) {
    return mapError(result.error);
  }

  revalidatePath("/events");
  redirect(`/events/${result.value.slug}`);
}
