"use client";

import { type ReactNode } from "react";
import { UsernamePrompt } from "@/components/profile/username-prompt";
import { useUsername } from "@/lib/profile/use-username";
import type { Username } from "./schema";

type UseRequireUsername = {
  username: Username | null;
  prompt: ReactNode;
};

export function useRequireUsername(): UseRequireUsername {
  const { username, ready } = useUsername();
  const prompt = ready && !username ? <UsernamePrompt open /> : null;
  return { username, prompt };
}
