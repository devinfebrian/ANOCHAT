import Link from "next/link";
import { EventTime } from "@/components/events/event-time";
import type { EventListItem } from "@/lib/events/queries";

type EventCardProps = {
  event: EventListItem;
  variant?: "upcoming" | "past";
};

export function EventCard({ event, variant = "upcoming" }: EventCardProps) {
  const isPast = variant === "past";
  return (
    <li>
      <Link
        href={`/events/${event.slug}`}
        className={`block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${
          isPast ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
              {event.title}
            </p>
            <p className="mt-0.5 break-words text-sm text-zinc-600 dark:text-zinc-400">
              <EventTime date={event.startsAt} /> · {event.locationText}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPast ? (
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Ended
              </span>
            ) : null}
            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {event.activityType}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {event.attendeesCount} / {event.maxParticipants} attending
        </p>
      </Link>
    </li>
  );
}