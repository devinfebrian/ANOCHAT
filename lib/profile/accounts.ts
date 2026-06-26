"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userAccounts } from "@/lib/db/schema";
import { usernameSchema, type Username } from "./schema";
import { getDeviceHash, getOrCreateDeviceId } from "./device";

export type AccountResult = { ok: true; username: Username } | { ok: false; error: string };

function classifyUnique(error: unknown): "name_taken" | "device_taken" | "other" {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  if (code !== "23505") return "other";
  const detail = String(
    (error as { detail?: string })?.detail ??
      (error as { cause?: { detail?: string } })?.cause?.detail ??
      "",
  );
  if (detail.includes("user_accounts_username_unique")) return "name_taken";
  if (detail.includes("user_accounts_pkey") || detail.includes("user_accounts_device_hash")) {
    return "device_taken";
  }
  return "other";
}

export async function claimUsername(name: string): Promise<AccountResult> {
  const parsed = usernameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };
  }
  const { hash } = await getOrCreateDeviceId();
  try {
    await db.insert(userAccounts).values({ deviceHash: hash, username: parsed.data });
    return { ok: true, username: parsed.data };
  } catch (error) {
    const kind = classifyUnique(error);
    if (kind === "name_taken") {
      return { ok: false, error: "That username is already taken on this server." };
    }
    if (kind === "device_taken") {
      return {
        ok: false,
        error: "This device already has an account. Use rename instead.",
      };
    }
    throw error;
  }
}

export async function renameUsername(newName: string): Promise<AccountResult> {
  const parsed = usernameSchema.safeParse(newName);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };
  }
  const hash = await getDeviceHash();
  if (!hash) {
    return { ok: false, error: "No account on this device." };
  }
  const updated = await db
    .update(userAccounts)
    .set({ username: parsed.data })
    .where(eq(userAccounts.deviceHash, hash))
    .returning({ username: userAccounts.username });
  if (updated.length === 0) {
    return { ok: false, error: "No account on this device." };
  }
  return { ok: true, username: parsed.data };
}

export async function removeAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const hash = await getDeviceHash();
  if (!hash) return { ok: true };
  await db.delete(userAccounts).where(eq(userAccounts.deviceHash, hash));
  return { ok: true };
}
