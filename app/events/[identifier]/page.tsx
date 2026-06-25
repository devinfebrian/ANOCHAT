import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventTime } from "@/components/events/event-time";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { RsvpControl } from "@/components/events/rsvp-control";
import { RequireUsername } from "@/components/events/require-username";
import { Avatar } from "@/components/profile/avatar";
import {
  getEventByIdentifier,
  getRsvpCounts,
  getUserRsvp,
  listEventAttendees,
} from "@/lib/events/queries";
import { getServerUsername } from "@/lib/profile/server";
import type { RsvpStatus } from "@/lib/db/schema";

type Props = { params: Promise<{ identifier: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifier } = await params;
  const event = await getEventByIdentifier(identifier);
  if (!event) return { title: "Event not found · ANOCHAT" };
  return { title: `${event.title} · ANOCHAT`, description: event.description ?? undefined };
}

const STATUS_GROUPS: { status: RsvpStatus; label: string }[] = [
  { status: "joining", label: "Joining" },
  { status: "interested", label: "Interested" },
  { status: "declined", label: "Can't make it" },
];

export default async function EventDetailPage({ params }: Props) {
  const { identifier } = await params;
  const event = await getEventByIdentifier(identifier);
  if (!event) notFound();

  const [attendees, counts, username] = await Promise.all([
    listEventAttendees(event.id),
    getRsvpCounts(event.id),
    getServerUsername(),
  ]);
  const currentRsvp = username ? await getUserRsvp(event.id, username) : null;
  const currentStatus = currentRsvp?.status ?? null;
  const currentNote = currentRsvp?.note ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/events"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to events
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <EventTime date={event.startsAt} /> · {event.locationText}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {event.activityType}
        </span>
      </div>

      {event.mapUrl ? (
        <p className="mt-3 text-sm">
          <a
            href={event.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            View map
          </a>
        </p>
      ) : null}

      {event.description ? (
        <p className="mt-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
          {event.description}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="text-zinc-500 dark:text-zinc-400">Hosted by</span>
        <Avatar username={event.createdBy} size={24} />
        <span className="font-medium text-zinc-900 dark:text-zinc-50">{event.createdBy}</span>
      </div>

      <div className="mt-6 flex items-center justify-end gap-4">
        <CopyLinkButton />
      </div>

      <RequireUsername>
        <RsvpControl
          identifier={event.slug}
          currentStatus={currentStatus}
          currentNote={currentNote}
          counts={counts}
        />
      </RequireUsername>

      <div className="mt-6 space-y-6">
        {STATUS_GROUPS.map(({ status, label }) => {
          const group = attendees.filter((a) => a.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label} <span className="font-normal">· {group.length}</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {group.map((a) => (
                  <li key={`${a.eventId}-${a.username}`} className="flex items-center gap-3 text-sm">
                    <Avatar username={a.username} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{a.username}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          RSVPed <EventTime date={a.joinedAt} />
                        </span>
                      </div>
                      {a.note ? (
                        <p
                          className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400"
                          title={a.note}
                        >
                          {a.note}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {attendees.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No responses yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
