import type { Metadata } from "next";
import { redirectToClaimIfMissingProfile } from "./actions";
import { ClaimUsernameForm } from "./claim-form";

export const metadata: Metadata = { title: "Claim username · ANOCHAT", robots: { index: false } };

export default async function ClaimUsernamePage() {
  await redirectToClaimIfMissingProfile();

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Pick a username
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your username is public, unique, and shown across events. You can rename it later, but the
        old name is reserved for 7 days.
      </p>
      <div className="mt-6">
        <ClaimUsernameForm />
      </div>
    </div>
  );
}