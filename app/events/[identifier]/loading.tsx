export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24 md:pb-10">
      <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 space-y-2">
        <div className="h-7 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="h-6 w-36 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-6 h-24 animate-pulse rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}
