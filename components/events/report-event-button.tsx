"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { REPORT_LIMITS } from "@/lib/reports/schema";
import { reportEvent, type ReportEventState } from "@/app/events/[identifier]/actions";

type ReportEventButtonProps = {
  identifier: string;
};

const initialState: ReportEventState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950"
    >
      {pending ? "Sending…" : "Send report"}
    </button>
  );
}

export function ReportEventButton({ identifier }: ReportEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportEvent, initialState);

  if (state.ok) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Reported for review. Thanks.</p>
    );
  }

  return (
    <div className="text-sm">
      {open ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="identifier" value={identifier} />
          <label
            htmlFor="report-reason"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            What&apos;s wrong with this event?
          </label>
          <textarea
            id="report-reason"
            name="reason"
            rows={3}
            required
            maxLength={REPORT_LIMITS.MAX_REASON}
            placeholder="Spam, harassment, wrong info…"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
          />
          {state.reasonError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{state.reasonError}</p>
          ) : null}
          {state.formError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{state.formError}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Submit />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Report this event
        </button>
      )}
    </div>
  );
}
