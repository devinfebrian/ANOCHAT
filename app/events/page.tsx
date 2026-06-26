import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { listPastEvents, listUpcomingEvents, type EventCursor } from "@/lib/events/queries";

export const metadata = { title: "Events · ANOCHAT" };

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function parseCursor(raw: string | undefined): EventCursor | undefined {
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  const sep = decoded.lastIndexOf("|");
  if (sep < 0) return undefined;
  const iso = decoded.slice(0, sep);
  const id = decoded.slice(sep + 1);
  const startsAt = new Date(iso);
  if (Number.isNaN(startsAt.getTime()) || !UUID_RE.test(id)) return undefined;
  return { startsAt, id };
}

function encodeCursor(c: EventCursor): string {
  return `${c.startsAt.toISOString()}|${c.id}`;
}

type Props = { searchParams: Promise<{ upcomingCursor?: string; pastCursor?: string }> };

export default async function EventsPage({ searchParams }: Props) {
  const { upcomingCursor: uRaw, pastCursor: pRaw } = await searchParams;
  const upcomingCursor = parseCursor(uRaw);
  const pastCursor = parseCursor(pRaw);

  const [{ items: upcoming, nextCursor: nextUpcoming }, { items: past, nextCursor: nextPast }] = await Promise.all([
    listUpcomingEvents(upcomingCursor),
    listPastEvents(pastCursor),
  ]);

  const validURaw = upcomingCursor ? uRaw : undefined;
  const validPRaw = pastCursor ? pRaw : undefined;

  const upcomingMoreHref = nextUpcoming
    ? `?${new URLSearchParams({
        ...(validPRaw ? { pastCursor: validPRaw } : {}),
        upcomingCursor: encodeCursor(nextUpcoming),
      }).toString()}`
    : null;
  const pastMoreHref = nextPast
    ? `?${new URLSearchParams({
        ...(validURaw ? { upcomingCursor: validURaw } : {}),
        pastCursor: encodeCursor(nextPast),
      }).toString()}`
    : null;

  const isInitial = !upcomingCursor && !pastCursor;
  const allEmpty = upcoming.length === 0 && past.length === 0;

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

      {allEmpty && isInitial ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No events yet. Create the first one.
        </div>
      ) : allEmpty ? (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No more events to load.
        </div>
      ) : (
        <>
          {upcoming.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {upcomingCursor ? "No more upcoming events." : "No upcoming events. Create one or browse past meetups below."}
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          )}
          {upcomingMoreHref ? (
            <div className="mt-4">
              <Link
                href={upcomingMoreHref}
                className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Load more upcoming
              </Link>
            </div>
          ) : null}

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
              {pastMoreHref ? (
                <div className="mt-4">
                  <Link
                    href={pastMoreHref}
                    className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Load more past
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
