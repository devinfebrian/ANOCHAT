-- #004 follow-up: route by slug needs unique constraint; lock down attendees RLS.
-- Slug must be unique so getEventByIdentifier(slug) resolves to exactly one event.
DROP INDEX IF EXISTS "events_slug_idx";
CREATE UNIQUE INDEX "events_slug_idx" ON "events" ("slug");

-- Attendees are personal data. Drop public anon SELECT; server (service role) bypasses RLS.
-- RLS stays enabled on event_attendees with no SELECT policy => default-deny for anon key.
DROP POLICY IF EXISTS "event_attendees_public_read" ON "event_attendees";
