"use client";

import { useActionState } from "react";
import { signUpWithEmail, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { ok: false };

export function EmailSignupForm() {
  const [state, action, pending] = useActionState(signUpWithEmail, initialState);

  if (state.ok && state.message) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="At least 8 characters"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Minimum 8 characters.
        </p>
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
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
