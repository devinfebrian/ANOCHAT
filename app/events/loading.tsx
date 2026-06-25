export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <ul className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}
