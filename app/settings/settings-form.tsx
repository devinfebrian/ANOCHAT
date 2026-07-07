"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/db/schema";
import {
  renameUsernameAction,
  updateProfileAction,
  uploadAvatarAction,
  type SettingsState,
} from "./actions";

const initialState: SettingsState = { ok: false };

function Banner({ state }: { state: SettingsState }) {
  if (state.ok && state.message) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        {state.message}
      </p>
    );
  }
  if (state.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {state.error}
      </p>
    );
  }
  return null;
}

function AvatarPreview({ profile }: { profile: Profile }) {
  if (profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        width={64}
        height={64}
        className="h-16 w-16 rounded-full border border-zinc-300 object-cover dark:border-zinc-700"
      />
    );
  }
  const initials = profile.displayName.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {initials}
    </div>
  );
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const links = (profile.links ?? []).slice();
  while (links.length < 5) links.push({ label: "", url: "" });

  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initialState);
  const [renameState, renameAction, renamePending] = useActionState(renameUsernameAction, initialState);
  const [avatarState, avatarAction, avatarPending] = useActionState(uploadAvatarAction, initialState);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Avatar
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <AvatarPreview profile={profile} />
          <form action={avatarAction} className="flex-1">
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="block text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-zinc-700 dark:text-zinc-300 dark:file:border-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-300"
            />
            <button
              type="submit"
              disabled={avatarPending}
              className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {avatarPending ? "Uploading…" : "Upload avatar"}
            </button>
          </form>
        </div>
        <div className="mt-2">
          <Banner state={avatarState} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Profile
        </h2>
        <form action={profileAction} className="mt-3 space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              minLength={2}
              maxLength={20}
              defaultValue={profile.displayName}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              maxLength={500}
              defaultValue={profile.bio ?? ""}
              placeholder="A couple of lines about you."
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Up to 500 characters.</p>
          </div>
          <div>
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">Links</span>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Up to 5. Empty rows are ignored.
            </p>
            <div className="mt-2 space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    name="linkLabel"
                    type="text"
                    maxLength={40}
                    defaultValue={link.label}
                    placeholder="Label"
                    className="w-1/3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
                  />
                  <input
                    name="linkUrl"
                    type="url"
                    maxLength={500}
                    defaultValue={link.url}
                    placeholder="https://…"
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
                  />
                </div>
              ))}
            </div>
          </div>
          <Banner state={profileState} />
          <button
            type="submit"
            disabled={profilePending}
            className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Username
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Current: <span className="font-medium text-zinc-900 dark:text-zinc-50">{profile.username}</span>.
          Renaming reserves the old name for 7 days before anyone else can claim it. Event and RSVP
          history keeps the old username as a snapshot.
        </p>
        <form action={renameAction} className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="username" className="sr-only">
              New username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              minLength={3}
              maxLength={20}
              pattern="^(?![._-]+$)[a-zA-Z0-9._-]+$"
              placeholder="new_username"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
            />
          </div>
          <button
            type="submit"
            disabled={renamePending}
            className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {renamePending ? "Renaming…" : "Rename"}
          </button>
        </form>
        <div className="mt-2">
          <Banner state={renameState} />
        </div>
      </section>
    </div>
  );
}