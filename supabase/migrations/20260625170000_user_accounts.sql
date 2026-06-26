-- #011 Anonymous accounts: one device picks one permanent username.
-- Persisted server-side so multiple devices can no longer share a name and a
-- device cannot rotate names per event. Username is denormalized into
-- event_attendees / reports as historical snapshots.
-- Idempotent. DB is empty in current deployment, so no backfill.

CREATE TABLE IF NOT EXISTS "user_accounts" (
  "device_hash" text PRIMARY KEY,
  "username" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "user_accounts" DROP CONSTRAINT IF EXISTS "user_accounts_username_format";
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_username_format"
  CHECK (char_length("username") BETWEEN 3 AND 20
    AND "username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$');

CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_username_unique"
  ON "user_accounts" ("username");

ALTER TABLE "user_accounts" ENABLE ROW LEVEL SECURITY;

-- Tighten device_hash columns: NOT NULL now that every insert path supplies a hash.
ALTER TABLE "event_attendees" ALTER COLUMN "device_hash" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "creator_device_hash" SET NOT NULL;
ALTER TABLE "reports" ALTER COLUMN "reporter_device_hash" SET NOT NULL;

-- Active-slot unique: one non-declined RSVP per device per event. Stops capacity
-- stuffing via username rotation. Declined rows free the slot for rename+rejoin.
CREATE UNIQUE INDEX IF NOT EXISTS "event_attendees_event_device_active_unique"
  ON "event_attendees" ("event_id", "device_hash")
  WHERE "status" <> 'declined';
