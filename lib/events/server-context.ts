import { db } from "@/lib/db";
import { getOrCreateDeviceId } from "@/lib/profile/device";
import { getServerUsername } from "@/lib/profile/server";
import { checkReportRateLimit } from "@/lib/reports/rate-limit";
import { clearManagerCookie, setManagerCookie } from "./management";
import { checkEventCreateRateLimit } from "./rate-limit";
import { createDbEventStore, type EventStore } from "./store";
import type { EventIntakeContext } from "./intake";

export async function createEventIntakeContext(options: { managerToken?: string | null } = {}): Promise<EventIntakeContext> {
  const [user, device] = await Promise.all([getServerUsername(), getOrCreateDeviceId()]);

  return {
    user,
    deviceHash: device.hash,
    now: new Date(),
    store: createDbEventStore(),
    managerCookie: {
      rawToken: options.managerToken ?? null,
      set: setManagerCookie,
      clear: clearManagerCookie,
    },
    rateLimit: {
      checkEventCreate: checkEventCreateRateLimit,
      checkReport: (deviceHash: string) => checkReportRateLimit(deviceHash, "event"),
    },
    withStoreInTransaction: async <T>(fn: (store: EventStore) => Promise<T>) =>
      db.transaction(async (tx) => fn(createDbEventStore(tx))),
  };
}
