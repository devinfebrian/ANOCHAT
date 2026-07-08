import type { Metadata } from "next";
import { LoginForm, SentMessage } from "./login-form";

export const metadata: Metadata = { title: "Sign in · ANOCHAT", robots: { index: false } };

type Props = {
  searchParams: Promise<{
    sent?: string;
    email?: string;
    error?: string;
    error_description?: string;
    redirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { sent, email, error, error_description, redirect } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {sent ? "Check your inbox" : "Sign in to ANOCHAT"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {sent
          ? `We sent a magic link to ${email ?? "your email"}. Click it to sign in. The link expires in 1 hour.`
          : "Enter your email and we'll send you a one-time magic link. No password needed."}
      </p>

      {sent ? (
        <SentMessage email={email} />
      ) : (
        <div className="mt-6">
          <LoginForm
            defaultRedirect={redirect || "/events"}
            initialError={error}
            initialErrorDescription={error_description}
          />
        </div>
      )}
    </div>
  );
}