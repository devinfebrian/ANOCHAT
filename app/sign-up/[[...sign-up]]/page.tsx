import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign up · WALLX", robots: { index: false } };

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16">
      <SignUp routing="path" path="/sign-up" signInUrl="/login" fallbackRedirectUrl="/claim-username" />
    </div>
  );
}
