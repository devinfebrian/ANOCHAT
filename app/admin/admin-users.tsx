"use client";

import { useState } from "react";
import { banUser, deleteUser, listUsers, unbanUser, type AdminUser } from "./actions";

export function AdminUsers({
  initialUsers,
  initialError,
}: {
  initialUsers: AdminUser[];
  initialError?: string;
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);

  async function load() {
    setLoading(true);
    setError(undefined);
    const res = await listUsers();
    if (!res.ok) {
      setError(res.error);
      setUsers([]);
    } else {
      setUsers(res.data);
    }
    setLoading(false);
  }

  async function ban(userId: string) {
    const res = await banUser(userId);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    await load();
  }

  async function unban(userId: string) {
    const res = await unbanUser(userId);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    await load();
  }

  async function remove(userId: string) {
    if (!confirm("Permanently delete this user?")) return;
    const res = await deleteUser(userId);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    await load();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading users…</p>;
  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Users
        </h1>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-zinc-500">No users yet.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Name
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Joined
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{user.email}</td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{user.name}</td>
                  <td className="px-4 py-2">
                    {user.banned ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {user.banned ? (
                        <button
                          type="button"
                          onClick={() => unban(user.id)}
                          className="text-xs underline underline-offset-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ban(user.id)}
                          className="text-xs underline underline-offset-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                        >
                          Ban
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(user.id)}
                        className="text-xs text-red-600 underline underline-offset-2 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
