"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RSVP_STATUSES, type RsvpStatus } from "@/lib/db/schema";
import { setRsvp, type SetRsvpState } from "@/app/events/[identifier]/actions";

type RsvpControlProps = {
  identifier: string;
  currentStatus: RsvpStatus | null;
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
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${STATUS_STYLES[status]} ${active ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950 ring-current" : ""}`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

export function RsvpControl({ identifier, currentStatus, counts }: RsvpControlProps) {
  const [state, formAction] = useActionState(setRsvp, initialState);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction} className="contents">
          <input type="hidden" name="identifier" value={identifier} />
          {RSVP_STATUSES.map((status) => (
            <RsvpButton key={status} status={status} current={currentStatus} />
          ))}
        </form>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {counts.joining} joining · {counts.interested} interested · {counts.declined} can&apos;t make it
      </p>

      {state.formError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.formError}</p>
      ) : null}
    </div>
  );
}
