-- #003 Create event form: extend events, add event_attendees, capacity trigger
-- Idempotent so re-runs against an environment where #001 init already ran are safe.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "activity_type" text NOT NULL DEFAULT 'other';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "starts_at" timestamptz;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location_text" text NOT NULL DEFAULT '';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "map_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "max_participants" integer;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "created_by" text NOT NULL DEFAULT '';

-- Backfill any existing rows so the NOT NULL columns pass when defaults are removed.
UPDATE "events"
SET "starts_at" = "created_at",
    "max_participants" = 2
WHERE "starts_at" IS NULL OR "max_participants" IS NULL;

ALTER TABLE "events" ALTER COLUMN "starts_at" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "max_participants" SET NOT NULL;
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_max_participants_range";
ALTER TABLE "events" ADD CONSTRAINT "events_max_participants_range"
  CHECK ("max_participants" BETWEEN 2 AND 100);
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_activity_type_valid";
ALTER TABLE "events" ADD CONSTRAINT "events_activity_type_valid"
  CHECK ("activity_type" IN ('hangout','sport','food','study','game','outdoor','travel','other'));

CREATE INDEX IF NOT EXISTS "events_starts_at_idx" ON "events" ("starts_at");

CREATE TABLE IF NOT EXISTS "event_attendees" (
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "username" text NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("event_id","username")
);

CREATE INDEX IF NOT EXISTS "event_attendees_username_idx" ON "event_attendees" ("username");

-- Capacity trigger: reject inserts past the event's max_participants.
CREATE OR REPLACE FUNCTION "enforce_event_capacity"() RETURNS trigger AS $$
DECLARE
  cap integer;
  current_count integer;
BEGIN
  SELECT "max_participants" INTO cap FROM "events" WHERE "id" = NEW."event_id";
  IF cap IS NULL THEN
    RAISE EXCEPTION 'Event % not found', NEW."event_id";
  END IF;
  SELECT count(*) INTO current_count FROM "event_attendees" WHERE "event_id" = NEW."event_id";
  IF current_count >= cap THEN
    RAISE EXCEPTION 'Event % is full (% / %)', NEW."event_id", current_count, cap;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_enforce_event_capacity" ON "event_attendees";
CREATE TRIGGER "trg_enforce_event_capacity"
  BEFORE INSERT ON "event_attendees"
  FOR EACH ROW EXECUTE FUNCTION "enforce_event_capacity"();
