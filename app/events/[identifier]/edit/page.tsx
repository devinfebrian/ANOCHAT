import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventForm } from "@/components/events/event-form";
import { RequireUsername } from "@/components/events/require-username";
import { getEventByIdentifier } from "@/lib/events/queries";
import { verifyEventManager } from "@/lib/events/management";

type Props = { params: Promise<{ identifier: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifier } = await params;
  const event = await getEventByIdentifier(identifier);
  if (!event) return { title: "Event not found · ANOCHAT" };
  return { title: `Edit ${event.title} · ANOCHAT`, robots: { index: false } };
}

export default async function EditEventPage({ params }: Props) {
  const { identifier } = await params;
  const event = await getEventByIdentifier(identifier);
  if (!event) notFound();
  if (event.cancelledAt) notFound();
  const allowed = await verifyEventManager(event);
  if (!allowed) notFound();

  const initial = {
    title: event.title,
    activityType: event.activityType,
    startsAtUtc: event.startsAt.toISOString(),
    locationText: event.locationText,
    mapUrl: event.mapUrl ?? "",
    maxParticipants: event.maxParticipants,
    description: event.description ?? "",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24 md:pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Edit event
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Update the details. The share link stays the same.
      </p>
      <div className="mt-6">
        <RequireUsername>
          <EventForm mode="edit" identifier={event.slug} initial={initial} />
        </RequireUsername>
      </div>
    </div>
  );
}