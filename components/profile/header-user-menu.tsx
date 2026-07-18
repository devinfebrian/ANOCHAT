"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

type HeaderUserMenuProps = {
  profile: { username: string; displayName: string; avatarUrl: string | null } | null;
};

export function HeaderUserMenu({ profile }: HeaderUserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!profile) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Sign in
      </Link>
    );
  }

  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const avatar = profile.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.avatarUrl}
      alt={profile.displayName}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full border border-zinc-300 object-cover dark:border-zinc-700"
    />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {initials}
    </span>
  );

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      >
        {avatar}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          <Link
            href={`/u/${profile.username}`}
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            @{profile.username}
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Settings
          </Link>
          <SignOutButton redirectUrl="/login">
            <button
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      ) : null}
    </div>
  );
}