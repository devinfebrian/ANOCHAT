import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = { title: "Sign in · WALLX", robots: { index: false } };

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo } = await searchParams;

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
        Sign in to WALLX
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Continue with Google to get started.
      </p>
      <div className="mt-6 w-full">
        <GoogleSignInButton redirectTo={redirectTo} />
      </div>
    </div>
  );
}
