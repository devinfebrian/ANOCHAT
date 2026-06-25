import Link from "next/link";
import { HeaderUserMenu } from "@/components/profile/header-user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          ANOCHAT
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/events" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Events
          </Link>
          <Link href="/events/new" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Create
          </Link>
        </nav>
        <div className="flex items-center">
          <HeaderUserMenu />
        </div>
      </div>
    </header>
  );
}