import { cookies } from "next/headers";
import { usernameSchema, type Username } from "./schema";

export const USERNAME_COOKIE = "anochat_username";

export async function getServerUsername(): Promise<Username | null> {
  const store = await cookies();
  const raw = store.get(USERNAME_COOKIE)?.value;
  if (!raw) return null;
  const parsed = usernameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
