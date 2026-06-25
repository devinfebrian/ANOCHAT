import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        ANOCHAT
      </h1>
      <p className="mt-3 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Event RSVP platform. Foundation ready.
      </p>
      <div className="mt-8 flex items-center gap-4 text-sm">
        <Link
          href="/api/health"
          className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          Health check
        </Link>
        <Link
          href="/events"
          className="rounded-full border border-zinc-200 px-5 py-2 text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}