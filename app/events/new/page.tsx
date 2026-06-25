import { EventForm } from "@/components/events/event-form";
import { RequireUsername } from "@/components/events/require-username";

export const metadata = { title: "Create event · ANOCHAT" };

export default function NewEventPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-24 md:pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create event
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Pick a time and place. You will be added as the first attendee.
      </p>
      <div className="mt-6">
        <RequireUsername>
          <EventForm />
        </RequireUsername>
      </div>
    </div>
  );
}
