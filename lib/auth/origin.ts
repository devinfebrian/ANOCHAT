import { env } from "@/lib/env";

export function getAppUrl(): string {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  if (env.NODE_ENV === "development") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_APP_URL is required in production");
}
