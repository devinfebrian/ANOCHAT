import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirect } from "@/lib/auth/redirect";
import { env } from "@/lib/env";

function loginErrorRedirect(
  origin: string,
  code: string,
  description?: string,
): NextResponse {
  const params = new URLSearchParams({ error: code });
  if (description) params.set("error_description", description);
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const redirectTarget = safeRedirect(url.searchParams.get("redirect"), "/claim-username");

  if (!code && !tokenHash) {
    const providerError = url.searchParams.get("error");
    if (providerError) {
      console.error("[auth/confirm] no code; Supabase error", {
        error: providerError,
        error_code: url.searchParams.get("error_code"),
        error_description: url.searchParams.get("error_description"),
      });
      return loginErrorRedirect(
        origin,
        providerError,
        url.searchParams.get("error_description") ?? undefined,
      );
    }
    console.error("[auth/confirm] no code or token_hash in callback", {
      params: [...url.searchParams.keys()],
    });
    return loginErrorRedirect(origin, "auth_failed", "Missing sign-in code.");
  }

  const response = NextResponse.redirect(new URL(redirectTarget, origin));
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/confirm] exchangeCodeForSession failed", {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return loginErrorRedirect(origin, error.code ?? "auth_failed", error.message);
    }
    return response;
  }

  if (!tokenHash) {
    return loginErrorRedirect(origin, "auth_failed", "Missing sign-in token.");
  }

  let otpType: "magiclink" | "email";
  if (type === "email" || type === "magiclink") {
    otpType = type;
  } else if (type === null) {
    otpType = "magiclink";
  } else {
    console.error("[auth/confirm] unsupported token type", { type });
    return loginErrorRedirect(origin, "auth_failed", "Invalid sign-in token type.");
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
  if (error) {
    console.error("[auth/confirm] verifyOtp failed", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    return loginErrorRedirect(origin, error.code ?? "auth_failed", error.message);
  }
  return response;
}