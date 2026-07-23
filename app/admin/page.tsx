import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/server";
import { AdminUsers } from "./admin-users";
import { listUsers } from "./actions";

export const metadata: Metadata = { title: "Admin · WALLX", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin();
  const res = await listUsers();
  return (
    <AdminUsers
      initialUsers={res.ok ? res.data : []}
      initialError={res.ok ? undefined : res.error}
    />
  );
}
