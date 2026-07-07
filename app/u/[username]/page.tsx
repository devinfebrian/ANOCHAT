import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByUsername } from "@/lib/profile/queries";
import { createDbEventStore } from "@/lib/events/store";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Profile not found · ANOCHAT" };
  return {
    title: `${profile.displayName} (@${profile.username}) · ANOCHAT`,
    description: profile.bio ?? undefined,
    robots: { index: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const store = createDbEventStore();
  const events = await store.listEventsCreatedByUser(profile.userId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-start gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            width={72}
            height={72}
            className="h-18 w-18 rounded-full border border-zinc-300 object-cover dark:border-zinc-700"
          />
        ) : (
          <div className="flex h-18 w-18 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-base font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {profile.displayName}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-3 break-words whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {profile.bio}
            </p>
          ) : null}
          {profile.links && profile.links.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Events created
        </h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm italic text-zinc-400 dark:text-zinc-500">
            No upcoming events. Check back later.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.slug}`}
                  className="block rounded-md border border-zinc-200 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{e.title}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(e.startsAt).toLocaleString()} · {e.locationText}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}