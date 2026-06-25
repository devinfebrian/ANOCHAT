-- #009 Basic abuse and data validation: defense-in-depth CHECK constraints.
-- zod rejects invalid input in server actions; these CHECKs catch any future
-- bypass (direct DB write, future anon-key path). Idempotent. Mirror existing style.

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_title_length";
ALTER TABLE "events" ADD CONSTRAINT "events_title_length"
  CHECK (char_length("title") BETWEEN 1 AND 120);

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_location_text_length";
ALTER TABLE "events" ADD CONSTRAINT "events_location_text_length"
  CHECK (char_length("location_text") BETWEEN 1 AND 200);

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_description_length";
ALTER TABLE "events" ADD CONSTRAINT "events_description_length"
  CHECK (char_length(coalesce("description", '')) <= 1000);

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_map_url_length";
ALTER TABLE "events" ADD CONSTRAINT "events_map_url_length"
  CHECK (char_length(coalesce("map_url", '')) <= 500);

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_created_by_format";
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_format"
  CHECK (char_length("created_by") BETWEEN 3 AND 20
    AND "created_by" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$');

ALTER TABLE "event_attendees" DROP CONSTRAINT IF EXISTS "event_attendees_username_format";
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_username_format"
  CHECK (char_length("username") BETWEEN 3 AND 20
    AND "username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$');
