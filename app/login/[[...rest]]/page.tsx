import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in · WALLX", robots: { index: false } };

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Sign in to WALLX
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Use your email or continue with Google.
      </p>
      <div className="mt-6">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={redirect || "/events"}
        />
      </div>
    </div>
  );
}
