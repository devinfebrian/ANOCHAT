"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ACTIVITY_TYPES } from "@/lib/db/schema";
import { EVENT_FORM_LIMITS } from "@/lib/events/schema";
import { createEvent, type CreateEventState } from "@/app/events/new/actions";
import {
  editEvent,
  type EditEventState,
} from "@/app/events/[identifier]/actions";

type Mode = "create" | "edit";

type InitialValues = Partial<{
  title: string;
  activityType: string;
  locationText: string;
  mapUrl: string;
  maxParticipants: number;
  description: string;
}> & { startsAtUtc?: string };

type EventFormProps = {
  mode?: Mode;
  identifier?: string;
  initial?: InitialValues;
};

const initialState: CreateEventState | EditEventState = { ok: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[0]}</p>;
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending
        ? mode === "edit"
          ? "Saving…"
          : "Creating…"
        : mode === "edit"
          ? "Save changes"
          : "Create event"}
    </button>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalDatetimeInput(isoUtc: string): string {
  const d = new Date(isoUtc);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ mode = "create", identifier, initial }: EventFormProps) {
  const action = mode === "edit" ? editEvent : createEvent;
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};
  const startsAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit" && initial?.startsAtUtc && startsAtRef.current) {
      startsAtRef.current.value = toLocalDatetimeInput(initial.startsAtUtc);
    }
  }, [mode, initial?.startsAtUtc]);

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="timezone"
        value={typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"}
      />
      {mode === "edit" && identifier ? (
        <input type="hidden" name="identifier" value={identifier} />
      ) : null}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={EVENT_FORM_LIMITS.MIN_TITLE}
          maxLength={EVENT_FORM_LIMITS.MAX_TITLE}
          defaultValue={initial?.title}
          placeholder="Friday coffee + board games"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <FieldError errors={fieldErrors.title} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="activityType" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Activity
          </label>
          <select
            id="activityType"
            name="activityType"
            required
            defaultValue={initial?.activityType ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
          >
            <option value="" disabled>
              Pick one
            </option>
            {ACTIVITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors.activityType} />
        </div>

        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Date and time
          </label>
          <input
            ref={startsAtRef}
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
          />
          <FieldError errors={fieldErrors.startsAt} />
        </div>
      </div>

      <div>
        <label htmlFor="locationText" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Location
        </label>
        <input
          id="locationText"
          name="locationText"
          required
          maxLength={EVENT_FORM_LIMITS.MAX_LOCATION}
          defaultValue={initial?.locationText}
          placeholder="Central Park, west entrance"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <FieldError errors={fieldErrors.locationText} />
      </div>

      <div>
        <label htmlFor="mapUrl" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Map link <span className="text-zinc-500 dark:text-zinc-400">(optional)</span>
        </label>
        <input
          id="mapUrl"
          name="mapUrl"
          type="url"
          maxLength={500}
          defaultValue={initial?.mapUrl}
          placeholder="https://maps.google.com/…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <FieldError errors={fieldErrors.mapUrl} />
      </div>

      <div>
        <label htmlFor="maxParticipants" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Target participants
        </label>
        <input
          id="maxParticipants"
          name="maxParticipants"
          type="number"
          required
          min={EVENT_FORM_LIMITS.MIN_PARTICIPANTS}
          max={EVENT_FORM_LIMITS.MAX_PARTICIPANTS}
          defaultValue={initial?.maxParticipants ?? 4}
          className="mt-1 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <FieldError errors={fieldErrors.maxParticipants} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Note <span className="text-zinc-500 dark:text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={EVENT_FORM_LIMITS.MAX_DESCRIPTION}
          defaultValue={initial?.description}
          placeholder="Bring snacks, dress for the weather…"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <FieldError errors={fieldErrors.description} />
      </div>

      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}