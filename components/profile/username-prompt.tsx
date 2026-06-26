"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { USERNAME_MAX, USERNAME_MIN, usernameSchema } from "@/lib/profile/schema";
import { useUsername } from "@/lib/profile/use-username";

type UsernamePromptProps = {
  open: boolean;
  onCancel?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export function UsernamePrompt({
  open,
  onCancel,
  title = "Pick a username",
  description = "Used to identify you across events on this device.",
  submitLabel = "Continue",
}: UsernamePromptProps) {
  const { claim } = useUsername();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !onCancel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onCancel) onCancel();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await claim(parsed.data);
      if (!result.ok) {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  const canCancel = Boolean(onCancel);

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${inputId}-title`}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2
          id={`${inputId}-title`}
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        <label htmlFor={inputId} className="sr-only">
          Username
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          placeholder="e.g. ada_l"
          disabled={pending}
          className="mt-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        {error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          {canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Claiming..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
