import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerUsername } from "@/lib/profile/server";
import type { Event } from "@/lib/db/schema";

// Per-event management token. Raw token lives in an httpOnly cookie scoped to
// the event page path; the sha256 hash is what we persist in the database so a
// DB read never leaks the credential. Authorization requires BOTH the matching
// raw token AND the creator username.

const COOKIE_PREFIX = "anochat_mgr_";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function cookieName(slug: string): string {
  return `${COOKIE_PREFIX}${slug}`;
}

export function generateManagementToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashManagementToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function setManagerCookie(slug: string, rawToken: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(slug), rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/events/${slug}`,
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearManagerCookie(slug: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(slug), "", { path: `/events/${slug}`, maxAge: 0 });
}

async function readManagerToken(slug: string): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(cookieName(slug))?.value;
  return raw && raw.length > 0 ? raw : null;
}

export async function verifyEventManager(
  event: Pick<Event, "slug" | "createdBy" | "managementTokenHash">,
): Promise<boolean> {
  const username = await getServerUsername();
  if (!username || username !== event.createdBy) return false;
  if (!event.managementTokenHash) return false;
  const raw = await readManagerToken(event.slug);
  if (!raw) return false;
  const submitted = Buffer.from(hashManagementToken(raw), "hex");
  const stored = Buffer.from(event.managementTokenHash, "hex");
  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
}