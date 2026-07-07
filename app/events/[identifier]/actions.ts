"use server";

import { revalidatePath } from "next/cache";
import {
  editEventSchema,
  eventFormValuesFromFormData,
  rsvpNoteSchema,
  rsvpStatusSchema,
} from "@/lib/events/schema";
import {
  cancelEvent as cancelEventIntake,
  editEvent as editEventIntake,
  removeRsvp as removeRsvpIntake,
  reportEvent as reportEventIntake,
  setRsvp as setRsvpIntake,
  type IntakeError,
} from "@/lib/events/intake";
import { createEventIntakeContext } from "@/lib/events/server-context";

export type SetRsvpState = {
  ok: boolean;
  formError?: string;
  noteError?: string;
};

function mapRsvpError(error: IntakeError): SetRsvpState {
  if (error.type === "validation_error") {
    return { ok: false, noteError: error.fieldErrors.note?.[0], formError: undefined };
  }
  if (error.type === "form_error") {
    return { ok: false, formError: error.message };
  }
  return mapFormError(error);
}

function mapFormError(error: IntakeError): { ok: false; formError: string } {
  switch (error.type) {
    case "not_authenticated":
      return { ok: false, formError: "Pick a username before this action." };
    case "event_not_found":
      return { ok: false, formError: "Event not found." };
    case "event_cancelled":
      return { ok: false, formError: "This event has been cancelled." };
    case "not_manager":
      return { ok: false, formError: "Only the creator can do this." };
    case "rate_limited":
      return { ok: false, formError: "Too many requests. Try again in a few minutes." };
    case "event_full":
      return { ok: false, formError: "Event is full." };
    case "already_reported":
      return { ok: false, formError: "You've already reported this event." };
    case "form_error":
      return { ok: false, formError: error.message };
    case "validation_error":
      return { ok: false, formError: Object.values(error.fieldErrors).flat()[0] ?? "Invalid input." };
    default:
      return { ok: false, formError: "Something went wrong." };
  }
}

export async function setRsvp(
  _prev: SetRsvpState,
  formData: FormData,
): Promise<SetRsvpState> {
  const identifier = String(formData.get("identifier") ?? "");
  const statusParsed = rsvpStatusSchema.safeParse(String(formData.get("status") ?? ""));
  if (!statusParsed.success || !identifier) {
    return { ok: false, formError: "Pick a valid RSVP status." };
  }

  const noteParsed = rsvpNoteSchema.safeParse(String(formData.get("note") ?? ""));
  if (!noteParsed.success) {
    return { ok: false, noteError: noteParsed.error.issues[0]?.message };
  }
  const note = noteParsed.data && noteParsed.data.trim() ? noteParsed.data.trim() : null;

  const ctx = await createEventIntakeContext();
  const result = await setRsvpIntake(identifier, { status: statusParsed.data, note }, ctx);
  if (!result.ok) {
    return mapRsvpError(result.error);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${identifier}`);
  return { ok: true };
}

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

  const ctx = await createEventIntakeContext();
  const result = await removeRsvpIntake(identifier, ctx);
  if (!result.ok) {
    return mapFormError(result.error);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${identifier}`);
  return { ok: true };
}

export type EditEventState = {
  ok: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
};

function mapEditError(error: IntakeError): EditEventState {
  if (error.type === "validation_error") {
    return { ok: false, fieldErrors: error.fieldErrors };
  }
  return mapFormError(error);
}

export async function editEvent(
  _prev: EditEventState,
  formData: FormData,
): Promise<EditEventState> {
  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const parsed = editEventSchema.safeParse(eventFormValuesFromFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

const ctx = await createEventIntakeContext();
    const result = await editEventIntake(identifier, parsed.data, ctx);
  if (!result.ok) {
    return mapEditError(result.error);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${identifier}`);
  revalidatePath(`/events/${identifier}/edit`);
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

const ctx = await createEventIntakeContext();
    const result = await cancelEventIntake(identifier, ctx);
  if (!result.ok) {
    return mapFormError(result.error);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${identifier}`);
  revalidatePath(`/events/${identifier}/edit`);
  return { ok: true };
}

export type ReportEventState = {
  ok: boolean;
  formError?: string;
  reasonError?: string;
};

function mapReportError(error: IntakeError): ReportEventState {
  if (error.type === "validation_error") {
    return {
      ok: false,
      reasonError: error.fieldErrors.reason?.[0],
      formError: error.fieldErrors.reason ? undefined : Object.values(error.fieldErrors).flat()[0],
    };
  }
  const { formError } = mapFormError(error);
  return { ok: false, formError };
}

export async function reportEvent(
  _prev: ReportEventState,
  formData: FormData,
): Promise<ReportEventState> {
  const identifier = String(formData.get("identifier") ?? "");
  if (!identifier) {
    return { ok: false, formError: "Event not found." };
  }

  const reason = String(formData.get("reason") ?? "");
  const ctx = await createEventIntakeContext();
  const result = await reportEventIntake(identifier, reason, ctx);
  if (!result.ok) {
    return mapReportError(result.error);
  }

  return { ok: true };
}
