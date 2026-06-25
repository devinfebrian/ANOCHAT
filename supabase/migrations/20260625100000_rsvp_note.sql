-- #006 Short RSVP notes: add optional note to event_attendees.
-- Idempotent. Nullable text, length capped at 120 chars.

ALTER TABLE "event_attendees"
  ADD COLUMN IF NOT EXISTS "note" text;

ALTER TABLE "event_attendees" DROP CONSTRAINT IF EXISTS "event_attendees_note_length";
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_note_length"
  CHECK (char_length(coalesce("note", '')) <= 120);