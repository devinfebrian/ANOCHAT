-- #005 RSVP status system: add status to event_attendees, capacity counts joining only.
-- Idempotent. Backfills existing attendees as 'joining'.

ALTER TABLE "event_attendees"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'joining';

ALTER TABLE "event_attendees" DROP CONSTRAINT IF EXISTS "event_attendees_status_valid";
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_status_valid"
  CHECK ("status" IN ('joining','interested','declined'));

ALTER TABLE "event_attendees" ALTER COLUMN "status" DROP DEFAULT;

-- Capacity now counts only status='joining'. Fire on INSERT and on UPDATE of event_id/status
-- so a switch into 'joining' is blocked when the event is full.
-- Self is excluded on UPDATE so re-affirming or no-op on a 'joining' row at cap still passes.
CREATE OR REPLACE FUNCTION "enforce_event_capacity"() RETURNS trigger AS $$
DECLARE
  cap integer;
  current_count integer;
BEGIN
  SELECT "max_participants" INTO cap FROM "events" WHERE "id" = NEW."event_id";
  IF cap IS NULL THEN
    RAISE EXCEPTION 'Event % not found', NEW."event_id";
  END IF;
  IF NEW."status" = 'joining' THEN
    SELECT count(*) INTO current_count FROM "event_attendees"
      WHERE "event_id" = NEW."event_id"
        AND "status" = 'joining'
        AND (TG_OP = 'INSERT' OR "username" <> NEW."username");
    IF current_count >= cap THEN
      RAISE EXCEPTION 'Event % is full (% / %)', NEW."event_id", current_count, cap
        USING ERRCODE = '45000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_enforce_event_capacity" ON "event_attendees";
CREATE TRIGGER "trg_enforce_event_capacity"
  BEFORE INSERT OR UPDATE OF "event_id", "status" ON "event_attendees"
  FOR EACH ROW EXECUTE FUNCTION "enforce_event_capacity"();
