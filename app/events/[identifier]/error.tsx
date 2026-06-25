"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Couldn&apos;t load this event
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Something went wrong while fetching the event details.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link
          href="/events"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Back to events
        </Link>
      </div>
    </div>
  );
}
