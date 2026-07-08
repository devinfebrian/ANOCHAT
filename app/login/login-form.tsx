"use client";

import { useEffect, useState, useSyncExternalStore, useActionState } from "react";
import Link from "next/link";
import { requestMagicLink, type RequestMagicLinkState } from "./actions";

const COOLDOWN_SECONDS = 60;

function friendlyError(code?: string | null, description?: string | null): string | undefined {
  const text = `${code ?? ""} ${description ?? ""}`.toLowerCase();
  if (code === "over_email_send_rate_limit" || text.includes("rate limit")) {
    return "Too many requests. Please wait 60 seconds before requesting another link.";
  }
  if (code === "otp_expired" || text.includes("otp_expired") || text.includes("invalid or has expired")) {
    return "This magic link is invalid or expired. Request a new one after the cooldown.";
  }
  if (code === "auth_failed" || text.includes("auth_failed")) {
    return description ?? "Sign-in failed. Please try again.";
  }
  return description ?? code ?? undefined;
}

type HashError = { code?: string; description?: string } | null;

let cachedHash = "";
let cachedHashError: HashError = null;

function readHashError(): HashError {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (hash === cachedHash) return cachedHashError;
  cachedHash = hash;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code")) {
    cachedHashError = {
      code: params.get("error_code") ?? params.get("error") ?? undefined,
      description: params.get("error_description") ?? undefined,
    };
  } else {
    cachedHashError = null;
  }
  return cachedHashError;
}

function subscribeHashError(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function subscribeCooldown(onChange: () => void): () => void {
  if (typeof window !== "undefined" && !sessionStorage.getItem("magicLinkSentAt")) {
    sessionStorage.setItem("magicLinkSentAt", String(Date.now()));
  }
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getCooldownRemaining(): number {
  if (typeof window === "undefined") return COOLDOWN_SECONDS;
  const stored = Number(sessionStorage.getItem("magicLinkSentAt") ?? 0);
  if (!stored) return COOLDOWN_SECONDS;
  return Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - stored) / 1000));
}

export function LoginForm({
  defaultRedirect,
  initialError,
  initialErrorDescription,
}: {
  defaultRedirect: string;
  initialError?: string;
  initialErrorDescription?: string;
}) {
  const [cooldown, setCooldown] = useState(0);
  const fragmentError = useSyncExternalStore(
    subscribeHashError,
    readHashError,
    () => null,
  );

  async function handleAction(
    prev: RequestMagicLinkState,
    formData: FormData,
  ): Promise<RequestMagicLinkState> {
    const result = await requestMagicLink(prev, formData);
    if (result.error && result.errorCode === "over_email_send_rate_limit") {
      setCooldown(COOLDOWN_SECONDS);
    }
    return result;
  }

  const [state, action, pending] = useActionState(handleAction, {
    ok: false,
    error: initialError,
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const errorMessage = state.error
    ? friendlyError(state.errorCode, state.error)
    : fragmentError
      ? friendlyError(fragmentError.code, fragmentError.description)
      : initialError
        ? friendlyError(initialError, initialErrorDescription)
        : undefined;

  const disabled = pending || cooldown > 0;

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
      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send magic link"}
      </button>
    </form>
  );
}

export function SentMessage({ email }: { email?: string }) {
  const remaining = useSyncExternalStore(
    subscribeCooldown,
    getCooldownRemaining,
    () => COOLDOWN_SECONDS,
  );

  return (
    <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
      {remaining > 0 ? (
        <p>Didn&apos;t get it? Check spam, or try again in {remaining}s.</p>
      ) : (
        <p>
          Didn&apos;t get it? Check spam, or{" "}
          <Link href="/login" className="underline underline-offset-2">
            try again
          </Link>
          .
        </p>
      )}
      {email ? <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Sent to {email}</p> : null}
    </div>
  );
}
