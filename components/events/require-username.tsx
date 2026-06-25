"use client";

import { type ReactNode } from "react";
import { UsernamePrompt } from "@/components/profile/username-prompt";
import { useUsername } from "@/lib/profile/use-username";

type RequireUsernameProps = {
  children: ReactNode;
};

export function RequireUsername({ children }: RequireUsernameProps) {
  const { username, ready } = useUsername();

  if (!ready) {
    return <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>;
  }
  if (!username) {
    return <UsernamePrompt open />;
  }
  return <>{children}</>;
}
