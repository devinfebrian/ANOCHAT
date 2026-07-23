"use server";

import { requireAdmin, createServiceSupabase } from "@/lib/supabase/server";

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
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
    if (error) throw error;
    const users: AdminUser[] = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.full_name as string) ?? "",
      banned: u.banned_until != null && new Date(u.banned_until) > new Date(),
      createdAt: new Date(u.created_at).getTime(),
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
    const supabase = createServiceSupabase();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Ban failed") };
  }
}

export async function unbanUser(userId: string): Promise<AdminResult<null>> {
  await requireAdmin();
  try {
    const supabase = createServiceSupabase();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Unban failed") };
  }
}

export async function deleteUser(userId: string): Promise<AdminResult<null>> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Cannot delete yourself." };
  try {
    const supabase = createServiceSupabase();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Delete failed") };
  }
}
