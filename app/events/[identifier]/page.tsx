import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { EventTime } from "@/components/events/event-time";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { RsvpControl } from "@/components/events/rsvp-control";
import { CancelEventButton } from "@/components/events/cancel-event-button";
import { RequireUsername } from "@/components/events/require-username";
import { Avatar } from "@/components/profile/avatar";
import {
  getEventByIdentifier,
  getRsvpCounts,
  getUserRsvp,
  listEventAttendees,
} from "@/lib/events/queries";
import { verifyEventManager } from "@/lib/events/management";
import { getServerUsername } from "@/lib/profile/server";
import type { RsvpStatus } from "@/lib/db/schema";

type Props = { params: Promise<{ identifier: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifier } = await params;
  const event = await getEventByIdentifier(identifier);
  if (!event) return { title: "Event not found · ANOCHAT" };
  const title = `${event.title} · ANOCHAT`;
  const description = event.description ?? undefined;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost";
  const url = `${proto}://${host}/events/${event.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "ANOCHAT",
    },
    twitter: { card: "summary" },
  };
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
  const isManager = await verifyEventManager(event);
  const cancelled = Boolean(event.cancelledAt);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24 md:pb-10">
      <Link
        href="/events"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to events
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {event.title}
          </h1>
          <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">
            <EventTime date={event.startsAt} /> · {event.locationText}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cancelled ? (
            <span className="rounded-full border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-300">
              Cancelled
            </span>
          ) : null}
          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            {event.activityType}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
          {counts.joining} joining · {event.maxParticipants} spots
        </span>
        <CopyLinkButton />
        {isManager && !cancelled ? (
          <>
            <Link
              href={`/events/${event.slug}/edit`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Edit
            </Link>
            <CancelEventButton identifier={event.slug} />
          </>
        ) : null}
      </div>

      {event.mapUrl ? (
        <p className="mt-3 break-all text-sm">
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
        <p className="mt-4 break-words whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
          {event.description}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="text-zinc-500 dark:text-zinc-400">Hosted by</span>
        <Avatar username={event.createdBy} size={24} />
        <span className="font-medium text-zinc-900 dark:text-zinc-50">{event.createdBy}</span>
      </div>

      {cancelled ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          This event has been cancelled by the host.
        </p>
      ) : (
        <RequireUsername>
          <RsvpControl
            identifier={event.slug}
            currentStatus={currentStatus}
            currentNote={currentNote}
            counts={counts}
          />
        </RequireUsername>
      )}

      <div className="mt-3 space-y-6">
        {STATUS_GROUPS.map(({ status, label }) => {
          const group = attendees.filter((a) => a.status === status);
          if (group.length === 0 && status === "declined") return null;
          return (
            <div key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label} <span className="font-normal">· {group.length}</span>
              </h2>
              {group.length === 0 ? (
                <p className="mt-2 text-sm italic text-zinc-400 dark:text-zinc-500">
                  No one yet · be the first
                </p>
              ) : (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
