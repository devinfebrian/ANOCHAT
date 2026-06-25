import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { listPastEvents, listUpcomingEvents } from "@/lib/events/queries";

export const metadata = { title: "Events · ANOCHAT" };

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([listUpcomingEvents(), listPastEvents()]);

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

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No events yet. Create the first one.
        </div>
      ) : (
        <>
          {upcoming.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No upcoming events. Create one or browse past meetups below.
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          )}

          {past.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Past events
              </h2>
              <ul className="mt-3 space-y-3">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} variant="past" />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}