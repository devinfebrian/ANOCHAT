import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · ANOCHAT", robots: { index: false } };

type Props = { searchParams: Promise<{ sent?: string; email?: string; error?: string; redirect?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { sent, email, error, redirect } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {sent ? "Check your inbox" : "Sign in to ANOCHAT"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {sent
          ? `We sent a magic link to ${email ?? "your email"}. Click it to sign in. The link expires in 1 hour.`
          : "Enter your email and we will send a one-time magic link. No password needed."}
      </p>

      {sent ? (
        <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Didn&apos;t get it? Check spam, or{" "}
          <Link href="/login" className="underline underline-offset-2">
            try again
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6">
          <LoginForm defaultRedirect={redirect || "/events"} initialError={error} />
        </div>
      )}
    </div>
  );
}