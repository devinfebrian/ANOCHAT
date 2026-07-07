"use client";

import { useActionState } from "react";
import { USERNAME_MAX, USERNAME_MIN } from "@/lib/profile/schema";
import { claimUsername, type ClaimUsernameState } from "./actions";

const initialState: ClaimUsernameState = { ok: false };

export function ClaimUsernameForm() {
  const [state, action, pending] = useActionState(claimUsername, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          autoComplete="off"
          spellCheck={false}
          pattern="^(?![._-]+$)[a-zA-Z0-9._-]+$"
          placeholder="e.g. ada_l"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Letters, numbers, dot, underscore, dash. {USERNAME_MIN}–{USERNAME_MAX} characters.
        </p>
      </div>
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-zinc-900 dark:text-zinc-50"
        >
          Display name <span className="text-zinc-500 dark:text-zinc-400">(optional)</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          minLength={2}
          maxLength={20}
          placeholder="Defaults to your username"
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
        {pending ? "Claiming…" : "Claim & continue"}
      </button>
    </form>
  );
}