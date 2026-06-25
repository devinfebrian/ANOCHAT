"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cancelEvent, type CancelEventState } from "@/app/events/[identifier]/actions";

type CancelEventButtonProps = {
  identifier: string;
};

const initialState: CancelEventState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950"
    >
      {pending ? "Cancelling…" : "Cancel event"}
    </button>
  );
}

export function CancelEventButton({ identifier }: CancelEventButtonProps) {
  const [state, formAction] = useActionState(cancelEvent, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="identifier" value={identifier} />
      <Submit />
      {state.formError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.formError}</p>
      ) : null}
    </form>
  );
}