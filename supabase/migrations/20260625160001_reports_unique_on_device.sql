-- #010 follow-up: swap reports unique key from reporter_username to reporter_device_hash.
-- One device = one report per (target_type, target_id). Anon username rotation can no
-- longer multiply reports. Pre-existing reporter_username unique dropped to allow
-- multi-username spam to be consolidated under one device.
-- Idempotent.

DROP INDEX IF EXISTS "reports_target_reporter_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "reports_target_reporter_device_unique"
  ON "reports" ("target_type", "target_id", "reporter_device_hash");
