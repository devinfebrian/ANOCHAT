"use client";

import { useId } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RSVP_STATUSES, type RsvpStatus } from "@/lib/db/schema";
import { RSVP_LIMITS } from "@/lib/events/schema";
import {
  removeRsvp,
  setRsvp,
  type RemoveRsvpState,
  type SetRsvpState,
} from "@/app/events/[identifier]/actions";

type RsvpControlProps = {
  identifier: string;
  currentStatus: RsvpStatus | null;
  currentNote: string | null;
  counts: { joining: number; interested: number; declined: number };
};

const STATUS_LABELS: Record<RsvpStatus, string> = {
  joining: "Joining",
  interested: "Interested",
  declined: "Can't make it",
};

const STATUS_STYLES: Record<RsvpStatus, string> = {
  joining:
    "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  interested:
    "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  declined:
    "border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

const initialState: SetRsvpState = { ok: false };
const initialRemoveState: RemoveRsvpState = { ok: false };

function RsvpButton({ status, current }: { status: RsvpStatus; current: RsvpStatus | null }) {
  const { pending } = useFormStatus();
  const active = current === status;
  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      aria-pressed={active}
      className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 md:flex-none md:py-1.5 ${STATUS_STYLES[status]} ${active ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950 ring-current" : ""}`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

function RemoveRsvpButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-red-300 hover:text-red-700 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-900 dark:hover:text-red-300"
    >
      {pending ? "Removing..." : "Remove my RSVP"}
    </button>
  );
}

export function RsvpControl({ identifier, currentStatus, currentNote, counts }: RsvpControlProps) {
  const [state, formAction] = useActionState(setRsvp, initialState);
  const [removeState, removeAction] = useActionState(removeRsvp, initialRemoveState);
  const noteId = useId();

  return (
    <div className="mt-6">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="identifier" value={identifier} />

        <div>
          <label htmlFor={noteId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id={noteId}
            name="note"
            rows={2}
            maxLength={RSVP_LIMITS.MAX_RSVP_NOTE}
            defaultValue={currentNote ?? ""}
            placeholder="e.g. Arriving 15 min late"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
          />
          {state.noteError ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.noteError}</p>
          ) : null}
        </div>

        {state.formError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{state.formError}</p>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t border-zinc-200 bg-white/90 px-4 py-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none dark:border-zinc-800 dark:bg-zinc-950/90">
          {RSVP_STATUSES.map((status) => (
            <RsvpButton key={status} status={status} current={currentStatus} />
          ))}
        </div>
      </form>

      {currentStatus ? (
        <form action={removeAction} className="mt-2 flex justify-end">
          <input type="hidden" name="identifier" value={identifier} />
          <RemoveRsvpButton />
        </form>
      ) : null}

      {removeState.formError ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{removeState.formError}</p>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {counts.joining} joining · {counts.interested} interested · {counts.declined} can&apos;t make it
      </p>
    </div>
  );
}
