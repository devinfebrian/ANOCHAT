-- #004 Shareable event page: public read RLS policies
-- Defense in depth: service connection bypasses RLS today, but lock public SELECT
-- for any future anon-key path (Supabase advisor: exposed schema without policy = default-deny).
-- Also ensure RLS is enabled on event_attendees (init migration intent; re-enable idempotently).

ALTER TABLE "event_attendees" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON "events";
CREATE POLICY "events_public_read" ON "events"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_attendees_public_read" ON "event_attendees";
CREATE POLICY "event_attendees_public_read" ON "event_attendees"
  FOR SELECT USING (true);
