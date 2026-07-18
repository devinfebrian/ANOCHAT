import { describe, test, beforeAll, beforeEach, expect, mock } from "bun:test";
import { randomUUID } from "node:crypto";

mock.module("next/server", () => ({
  connection: async () => {},
}));

const { setupSchema, resetTables, seedProfile, seedEvent, seedReport } = await import(
  "../../test/helpers"
);
const { createDbRateLimiter } = await import("@/lib/events/rate-limit");

const allow = { ok: true as const, value: { done: true } };

describe("RateLimiter (createDbRateLimiter)", () => {
  beforeAll(async () => {
    await setupSchema();
  });

  beforeEach(async () => {
    await resetTables();
  });

  describe("withEventCreate", () => {
    test("allows when under the event-create cap", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "creator", displayName: "Creator" });
      const limiter = createDbRateLimiter();

      const result = await limiter.withEventCreate(userId, async () => allow);

      expect(result.ok).toBe(true);
    });

    test("returns rate_limited when at the event-create cap", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "creator", displayName: "Creator" });
      for (let i = 0; i < 3; i++) {
        await seedEvent(userId, "creator", `ev-${i}-${randomUUID()}`);
      }
      const limiter = createDbRateLimiter();

      const result = await limiter.withEventCreate(userId, async () => allow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("rate_limited");
      }
    });

    test("does not count another user's events", async () => {
      const userId = randomUUID();
      const otherId = randomUUID();
      await seedProfile({ userId, username: "creator", displayName: "Creator" });
      await seedProfile({ userId: otherId, username: "other", displayName: "Other" });
      for (let i = 0; i < 3; i++) {
        await seedEvent(otherId, "other", `other-ev-${i}-${randomUUID()}`);
      }
      const limiter = createDbRateLimiter();

      const result = await limiter.withEventCreate(userId, async () => allow);

      expect(result.ok).toBe(true);
    });
  });

  describe("withReport", () => {
    test("allows when under the report cap", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "reporter", displayName: "Reporter" });
      const limiter = createDbRateLimiter();

      const result = await limiter.withReport(userId, async () => allow);

      expect(result.ok).toBe(true);
    });

    test("returns rate_limited when at the report cap", async () => {
      const userId = randomUUID();
      await seedProfile({ userId, username: "reporter", displayName: "Reporter" });
      for (let i = 0; i < 5; i++) {
        await seedReport(userId, "reporter", randomUUID());
      }
      const limiter = createDbRateLimiter();

      const result = await limiter.withReport(userId, async () => allow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("rate_limited");
      }
    });
  });
});
