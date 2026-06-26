"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Avatar } from "@/components/profile/avatar";
import { USERNAME_MAX, USERNAME_MIN, usernameSchema } from "@/lib/profile/schema";
import { useUsername } from "@/lib/profile/use-username";

type UsernameEditorProps = {
  open: boolean;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
};

export function UsernameEditor({ open, onClose, containerRef }: UsernameEditorProps) {
  const { username, rename, remove } = useUsername();
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const bounds = containerRef?.current ?? popoverRef.current;
      if (!bounds) return;
      if (!bounds.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, containerRef]);

  if (!open || !username) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    if (parsed.data === username) {
      onClose();
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await rename(parsed.data);
      if (!result.ok) {
        setError(result.error);
      } else {
        onClose();
      }
    } finally {
      setPending(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    try {
      const result = await remove();
      if (!result.ok) {
        setError(result.error);
      } else {
        onClose();
      }
    } finally {
      setRemoving(false);
    }
  };

  const busy = pending || removing;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Edit username"
      className="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <Avatar username={username} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {username}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Anonymous account on this device</p>
          </div>
        </div>
        <label htmlFor={inputId} className="mt-4 block text-xs text-zinc-600 dark:text-zinc-400">
          Change username
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
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        {error ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="text-xs text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-red-400"
          >
            {removing ? "Removing..." : "Remove account"}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
