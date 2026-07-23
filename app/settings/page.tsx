import type { Metadata } from "next";
import { requireProfile } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings · ANOCHAT", robots: { index: false } };

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 pb-24 md:pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Manage your public profile at{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-50">/u/{profile.username}</span>.
      </p>
      <div className="mt-8">
        <SettingsForm profile={profile} />
      </div>
    </div>
  );
}