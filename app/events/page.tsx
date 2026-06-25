import Link from "next/link";
import { listUpcomingEvents } from "@/lib/events/queries";

const dateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatStartsAt(value: Date) {
  return dateFormatter.format(value);
}

export const metadata = { title: "Events · ANOCHAT" };

export default async function EventsPage() {
  const items = await listUpcomingEvents();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Events
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Casual meetups around you.
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create event
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No events yet. Create the first one.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatStartsAt(event.startsAt)} · {event.locationText}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  {event.activityType}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {event.attendeesCount} / {event.maxParticipants} attending
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
