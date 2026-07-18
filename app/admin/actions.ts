"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  banned: boolean;
  createdAt: number;
};

export type AdminResult<T> = { ok: true; data: T } | { ok: false; error: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function listUsers(): Promise<AdminResult<AdminUser[]>> {
  await requireAdmin();
  try {
    const client = await clerkClient();
    const res = await client.users.getUserList({ limit: 100 });
    const users: AdminUser[] = res.data.map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
      banned: u.banned,
      createdAt: u.createdAt,
    }));
    return { ok: true, data: users };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Could not load users.") };
  }
}

export async function banUser(userId: string): Promise<AdminResult<null>> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Cannot ban yourself." };
  try {
    const client = await clerkClient();
    await client.users.banUser(userId);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Ban failed") };
  }
}

export async function unbanUser(userId: string): Promise<AdminResult<null>> {
  await requireAdmin();
  try {
    const client = await clerkClient();
    await client.users.unbanUser(userId);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Unban failed") };
  }
}

export async function deleteUser(userId: string): Promise<AdminResult<null>> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Cannot delete yourself." };
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Delete failed") };
  }
}
