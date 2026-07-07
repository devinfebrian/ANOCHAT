"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";

export function LoginForm({
  defaultRedirect,
  initialError,
}: {
  defaultRedirect: string;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState(requestMagicLink, {
    ok: false,
    error: initialError,
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirect" value={defaultRedirect} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.email}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
      </div>
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}