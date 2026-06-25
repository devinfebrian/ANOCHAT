"use server";

import { cookies } from "next/headers";
import { USERNAME_COOKIE } from "./server";
import { usernameSchema, type Username } from "./schema";

export async function syncUsernameCookie(value: string | null): Promise<Username | null> {
  const store = await cookies();
  if (value === null) {
    store.delete(USERNAME_COOKIE);
    return null;
  }
  const parsed = usernameSchema.safeParse(value);
  if (!parsed.success) return null;
  store.set(USERNAME_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return parsed.data;
}
