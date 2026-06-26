import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { userAccounts } from "@/lib/db/schema";
import { usernameSchema, type Username } from "./schema";
import { getDeviceHash } from "./device";

export async function getServerUsername(): Promise<Username | null> {
  await connection();
  const hash = await getDeviceHash();
  if (!hash) return null;
  const rows = await db
    .select({ username: userAccounts.username })
    .from(userAccounts)
    .where(eq(userAccounts.deviceHash, hash))
    .limit(1);
  const raw = rows[0]?.username;
  if (!raw) return null;
  const parsed = usernameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
