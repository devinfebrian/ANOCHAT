import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, usernameReservations, type Profile, type LinkEntry } from "@/lib/db/schema";
import { bioSchema, displayNameSchema, profileLinksSchema, usernameSchema } from "./schema";

export const RENAME_COOLDOWN_DAYS = 7;

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export type UsernameCheck = { available: boolean; reason?: string };

export async function checkUsernameAvailable(
  name: string,
  currentUserId?: string,
): Promise<UsernameCheck> {
  const parsed = usernameSchema.safeParse(name);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message };
  }
  const target = parsed.data;

  const [existing] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.username, target))
    .limit(1);
  if (existing && existing.userId !== currentUserId) {
    return { available: false, reason: "That username is already taken." };
  }

  const now = new Date();
  const [reservation] = await db
    .select()
    .from(usernameReservations)
    .where(
      and(
        eq(usernameReservations.username, target),
        gt(usernameReservations.reservedUntil, now),
      ),
    )
    .limit(1);
  if (reservation && reservation.reservedBy !== currentUserId) {
    return {
      available: false,
      reason:
        "That username was recently released by a rename and is reserved for 7 days. Try again later.",
    };
  }

  return { available: true };
}

export type ProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

export async function createProfile(
  userId: string,
  username: string,
  displayName: string,
): Promise<ProfileResult> {
  const nameParsed = usernameSchema.safeParse(username);
  if (!nameParsed.success) {
    return { ok: false, error: nameParsed.error.issues[0]?.message ?? "Invalid username" };
  }
  const displayParsed = displayNameSchema.safeParse(displayName);
  if (!displayParsed.success) {
    return {
      ok: false,
      error: displayParsed.error.issues[0]?.message ?? "Invalid display name",
    };
  }

  const check = await checkUsernameAvailable(nameParsed.data, userId);
  if (!check.available) {
    return { ok: false, error: check.reason ?? "Username unavailable." };
  }

  try {
    const [row] = await db
      .insert(profiles)
      .values({
        userId,
        username: nameParsed.data,
        displayName: displayParsed.data,
      })
      .returning();
    return { ok: true, profile: row! };
  } catch (error) {
    if (isUniqueViolation(error, "profiles_username_unique")) {
      return { ok: false, error: "That username is already taken." };
    }
    throw error;
  }
}

export async function renameUsername(profile: Profile, newName: string): Promise<ProfileResult> {
  const nameParsed = usernameSchema.safeParse(newName);
  if (!nameParsed.success) {
    return { ok: false, error: nameParsed.error.issues[0]?.message ?? "Invalid username" };
  }
  if (nameParsed.data === profile.username) {
    return { ok: true, profile };
  }

  const check = await checkUsernameAvailable(nameParsed.data, profile.userId);
  if (!check.available) {
    return { ok: false, error: check.reason ?? "Username unavailable." };
  }

  const reservedUntil = new Date(Date.now() + RENAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  try {
    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(profiles)
        .set({ username: nameParsed.data })
        .where(eq(profiles.userId, profile.userId))
        .returning();
      if (!row) throw new Error("Profile not found");
      await tx
        .insert(usernameReservations)
        .values({
          username: profile.username,
          reservedUntil,
          reservedBy: profile.userId,
        })
        .onConflictDoUpdate({
          target: usernameReservations.username,
          set: { reservedUntil, reservedBy: profile.userId },
        });
      return [row] as const;
    });
    return { ok: true, profile: updated };
  } catch (error) {
    if (isUniqueViolation(error, "profiles_username_unique")) {
      return { ok: false, error: "That username is already taken." };
    }
    throw error;
  }
}

export type ProfileUpdate = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links?: LinkEntry[];
};

export async function updateProfile(userId: string, data: ProfileUpdate): Promise<Profile> {
  const update: Partial<Profile> = {};
  if (data.displayName !== undefined) {
    const parsed = displayNameSchema.safeParse(data.displayName);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid display name");
    update.displayName = parsed.data;
  }
  if (data.bio !== undefined) {
    const parsed = bioSchema.safeParse(data.bio);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid bio");
    update.bio = parsed.data && parsed.data.trim().length > 0 ? parsed.data.trim() : null;
  }
  if (data.avatarUrl !== undefined) {
    update.avatarUrl = data.avatarUrl && data.avatarUrl.trim().length > 0 ? data.avatarUrl.trim() : null;
  }
  if (data.links !== undefined) {
    const parsed = profileLinksSchema.safeParse(data.links);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid links");
    update.links = parsed.data;
  }

  const [row] = await db
    .update(profiles)
    .set(update)
    .where(eq(profiles.userId, userId))
    .returning();
  if (!row) throw new Error("Profile not found");
  return row;
}

export async function touchLastSeen(userId: string): Promise<void> {
  await db
    .update(profiles)
    .set({ lastSeen: new Date() })
    .where(eq(profiles.userId, userId));
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  if (code !== "23505") return false;
  const detail = String(
    (error as { detail?: string })?.detail ??
      (error as { cause?: { detail?: string } })?.cause?.detail ??
      "",
  );
  return detail.includes(constraint) || detail.includes("profiles_username") || detail.includes("username");
}