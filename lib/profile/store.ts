import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profiles,
  usernameReservations,
  type Profile,
  type LinkEntry,
} from "@/lib/db/schema";
import {
  usernameSchema,
  displayNameSchema,
  bioSchema,
  profileLinksSchema,
} from "./schema";
import { createServiceSupabase } from "@/lib/supabase/server";
import { createDbEventStore } from "@/lib/events/store";

export const RENAME_COOLDOWN_DAYS = 7;

export type UsernameCheck = { available: boolean; reason?: string };

export type CreateProfileInput = {
  userId: string;
  username: string;
  displayName: string;
};

export type ProfileUpdateInput = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links?: LinkEntry[];
};

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.username, username)).limit(1);
  return rows[0] ?? null;
}

export interface ProfileStore {
  getProfileByUserId(userId: string): Promise<Profile | null>;
  checkUsernameAvailable(name: string, currentUserId?: string): Promise<UsernameCheck>;
  createProfile(input: CreateProfileInput): Promise<Profile>;
  updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile>;
  renameUsername(profile: Profile, newName: string): Promise<Profile>;
  getAvatarUploadPath(userId: string): string;
  createSignedAvatarUploadUrl(userId: string): Promise<{ signedUrl: string; path: string }>;
  getAvatarPublicUrl(path: string): Promise<string>;
}

export function createDbProfileStore(): ProfileStore {
  return {
    async getProfileByUserId(userId: string): Promise<Profile | null> {
      const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      return rows[0] ?? null;
    },

    async checkUsernameAvailable(
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
    },

    async createProfile(input: CreateProfileInput): Promise<Profile> {
      const nameParsed = usernameSchema.safeParse(input.username);
      if (!nameParsed.success) {
        throw new Error(nameParsed.error.issues[0]?.message ?? "Invalid username");
      }
      const displayParsed = displayNameSchema.safeParse(input.displayName);
      if (!displayParsed.success) {
        throw new Error(displayParsed.error.issues[0]?.message ?? "Invalid display name");
      }

      const check = await this.checkUsernameAvailable(nameParsed.data, input.userId);
      if (!check.available) {
        throw new Error(check.reason ?? "Username unavailable.");
      }

      try {
        const [row] = await db
          .insert(profiles)
          .values({
            userId: input.userId,
            username: nameParsed.data,
            displayName: displayParsed.data,
          })
          .returning();
        return row!;
      } catch (error) {
        if (isUniqueViolation(error, "profiles_username_unique")) {
          throw new Error("That username is already taken.");
        }
        throw error;
      }
    },

    async updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
      const update: Partial<Profile> = {};
      if (input.displayName !== undefined) {
        const parsed = displayNameSchema.safeParse(input.displayName);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid display name");
        update.displayName = parsed.data;
      }
      if (input.bio !== undefined) {
        const parsed = bioSchema.safeParse(input.bio);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid bio");
        update.bio = parsed.data && parsed.data.trim().length > 0 ? parsed.data.trim() : null;
      }
      if (input.avatarUrl !== undefined) {
        update.avatarUrl = input.avatarUrl && input.avatarUrl.trim().length > 0 ? input.avatarUrl.trim() : null;
      }
      if (input.links !== undefined) {
        const parsed = profileLinksSchema.safeParse(input.links);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid links");
        update.links = parsed.data;
      }

      const [row] = await db.update(profiles).set(update).where(eq(profiles.userId, userId)).returning();
      if (!row) throw new Error("Profile not found");
      return row;
    },

    async renameUsername(profile: Profile, newName: string): Promise<Profile> {
      const nameParsed = usernameSchema.safeParse(newName);
      if (!nameParsed.success) {
        throw new Error(nameParsed.error.issues[0]?.message ?? "Invalid username");
      }
      if (nameParsed.data === profile.username) {
        return profile;
      }

      const check = await this.checkUsernameAvailable(nameParsed.data, profile.userId);
      if (!check.available) {
        throw new Error(check.reason ?? "Username unavailable.");
      }

      const reservedUntil = new Date(Date.now() + RENAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      try {
        const [updated] = await db.transaction(async (tx) => {
          const txEventStore = createDbEventStore(tx);
          const [row] = await tx
            .update(profiles)
            .set({ username: nameParsed.data })
            .where(eq(profiles.userId, profile.userId))
            .returning();
          if (!row) throw new Error("Profile not found");

          await txEventStore.updateEventsCreatedBy(profile.username, nameParsed.data);
          await txEventStore.updateAttendeeUsernames(profile.username, nameParsed.data);

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
        return updated;
      } catch (error) {
        if (isUniqueViolation(error, "profiles_username_unique")) {
          throw new Error("That username is already taken.");
        }
        throw error;
      }
    },

    getAvatarUploadPath(userId: string): string {
      return `${userId}/avatar`;
    },

    async createSignedAvatarUploadUrl(userId: string): Promise<{ signedUrl: string; path: string }> {
      const supabase = createServiceSupabase();
      const path = this.getAvatarUploadPath(userId);
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUploadUrl(path, { upsert: true });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Could not create upload URL.");
      }

      return { signedUrl: data.signedUrl, path: data.path };
    },

    async getAvatarPublicUrl(path: string): Promise<string> {
      const supabase = await createServiceSupabase();
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!data.publicUrl) {
        throw new Error("Could not retrieve avatar URL.");
      }
      // Cache-bust the public URL so the new image shows immediately.
      return `${data.publicUrl}?v=${Date.now()}`;
    },
  };
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const code =
    (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
  if (code !== "23505") return false;
  const errConstraint =
    (error as { constraint?: string })?.constraint ??
    (error as { constraint_name?: string })?.constraint_name ??
    (error as { cause?: { constraint?: string } })?.cause?.constraint ??
    (error as { cause?: { constraint_name?: string } })?.cause?.constraint_name;
  return errConstraint === constraint;
}
