export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="h-7 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-9 w-full animate-pulse rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
