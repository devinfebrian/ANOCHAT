import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { EmailSignupForm } from "@/components/auth/email-signup-form";

export const metadata: Metadata = { title: "Sign in · WALLX", robots: { index: false } };

type Props = {
  searchParams: Promise<{ redirect?: string; tab?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo, tab } = await searchParams;
  const showSignup = tab === "signup";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(redirectTo || "/events");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {showSignup ? "Create an account" : "Sign in to WALLX"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {showSignup
          ? "Enter your email to get started."
          : "Enter your email and password to sign in."}
      </p>

      <div className="mt-6 w-full">
        {showSignup ? <EmailSignupForm /> : <EmailLoginForm redirectTo={redirectTo} />}
      </div>

      <div className="mt-6 flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">or</span>
        <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="mt-6 w-full">
        <GoogleSignInButton redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        {showSignup ? (
          <>
            Already have an account?{" "}
            <a
              href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              Sign in
            </a>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <a
              href={`/login?tab=signup${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
            >
              Create account
            </a>
          </>
        )}
      </p>
    </div>
  );
}
