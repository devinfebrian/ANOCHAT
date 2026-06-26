-- #010 Per-device binding: add device_hash columns + indexes.
-- Anonymous auth: each browser stores a sha256-hashed device id in an httpOnly cookie.
-- Pairs with 20260625160001 (reports unique key swap) and code changes in actions.ts.
-- Idempotent. Columns nullable so existing rows grandfather in.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "creator_device_hash" text;

ALTER TABLE "event_attendees"
  ADD COLUMN IF NOT EXISTS "device_hash" text;

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "reporter_device_hash" text;

CREATE INDEX IF NOT EXISTS "events_creator_device_hash_idx"
  ON "events" ("creator_device_hash");
CREATE INDEX IF NOT EXISTS "event_attendees_device_hash_idx"
  ON "event_attendees" ("device_hash");
CREATE INDEX IF NOT EXISTS "reports_reporter_device_hash_idx"
  ON "reports" ("reporter_device_hash");
