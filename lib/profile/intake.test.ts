import { describe, test, beforeAll, beforeEach, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  setupSchema,
  resetTables,
  seedProfile,
  seedEvent,
  seedAttendee,
  getProfileByUsername,
  getEventCreatedBy,
  getAttendeeUsername,
} from "../../test/helpers";
import { createDbProfileStore } from "@/lib/profile/store";
import {
  claimUsername,
  updateProfile,
  renameUsername,
  saveAvatarUrl,
  type ProfileIntakeContext,
} from "@/lib/profile/intake";
import type { Profile } from "@/lib/db/schema";

function makeCtx(profile: Profile | null, userId: string | null): ProfileIntakeContext {
  return {
    user: userId ? { userId } : null,
    profile,
    now: new Date(),
    store: createDbProfileStore(),
  };
}

describe("Profile intake", () => {
  beforeAll(async () => {
    await setupSchema();
  });

  beforeEach(async () => {
    await resetTables();
  });

  describe("claimUsername", () => {
    test("creates a profile when username is available", async () => {
      const userId = randomUUID();
      const ctx = makeCtx(null, userId);

      const result = await claimUsername({ username: "newperson", displayName: "New Person" }, ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.username).toBe("newperson");
        expect(result.value.displayName).toBe("New Person");
      }
    });

    test("defaults displayName to username when omitted", async () => {
      const userId = randomUUID();
      const ctx = makeCtx(null, userId);

      const result = await claimUsername({ username: "solo" }, ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.displayName).toBe("solo");
      }
    });

    test("returns not_authenticated when no user", async () => {
      const ctx = makeCtx(null, null);

      const result = await claimUsername({ username: "anon" }, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("not_authenticated");
      }
    });

    test("returns username_taken when username already used", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "taken", displayName: "Taken" });
      const ctx = makeCtx(null, randomUUID());

      const result = await claimUsername({ username: "taken" }, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("username_taken");
      }
    });

    test("returns invalid_username when too short", async () => {
      const ctx = makeCtx(null, randomUUID());

      const result = await claimUsername({ username: "ab" }, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("invalid_username");
      }
    });
  });

  describe("updateProfile", () => {
    test("updates display name, bio, and links", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "editor", displayName: "Editor" });
      const profile = await getProfileByUsername("editor") as Profile;
      const ctx = makeCtx(profile, userId);

      const result = await updateProfile(
        { displayName: "New Name", bio: "My bio", links: [{ label: "Site", url: "https://example.com" }] },
        ctx,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.displayName).toBe("New Name");
        expect(result.value.bio).toBe("My bio");
      }
    });

    test("returns profile_not_found when no profile in context", async () => {
      const ctx = makeCtx(null, randomUUID());

      const result = await updateProfile({ displayName: "X" }, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("profile_not_found");
      }
    });
  });

  describe("renameUsername", () => {
    test("renames and cascades to events and attendees", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "oldname", displayName: "Old" });
      const eventId = await seedEvent(userId, "oldname", "oldname-event");
      await seedAttendee(eventId, userId, "oldname");
      const profile = await getProfileByUsername("oldname") as Profile;
      const ctx = makeCtx(profile, userId);

      const result = await renameUsername("newname", ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.username).toBe("newname");
      }

      const events = await getEventCreatedBy("newname");
      expect(events.length).toBeGreaterThan(0);
      const attendee = await getAttendeeUsername("newname");
      expect(attendee).not.toBeNull();
    });

    test("returns same profile when name unchanged", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "same", displayName: "Same" });
      const profile = await getProfileByUsername("same") as Profile;
      const ctx = makeCtx(profile, userId);

      const result = await renameUsername("same", ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.username).toBe("same");
      }
    });

    test("returns username_taken when target is taken", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "first", displayName: "First" });
      await seedProfile({ userId: randomUUID(), username: "second", displayName: "Second" });
      const profile = await getProfileByUsername("first") as Profile;
      const ctx = makeCtx(profile, userId);

      const result = await renameUsername("second", ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("username_taken");
      }
    });
  });

  describe("saveAvatarUrl", () => {
    test("returns invalid_avatar_path when path does not match userId", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "avatar", displayName: "Avatar" });
      const profile = await getProfileByUsername("avatar") as Profile;
      const ctx = makeCtx(profile, userId);

      const result = await saveAvatarUrl("someone-else/avatar", ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("invalid_avatar_path");
      }
    });
  });
});
