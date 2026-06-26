import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "anochat_device";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function generateDeviceId(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceId(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type Device = { raw: string; hash: string };

export async function getOrCreateDeviceId(): Promise<Device> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing && existing.length > 0) {
    return { raw: existing, hash: hashDeviceId(existing) };
  }
  const raw = generateDeviceId();
  store.set(COOKIE_NAME, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return { raw, hash: hashDeviceId(raw) };
}

export async function getDeviceHash(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw && raw.length > 0 ? hashDeviceId(raw) : null;
}
