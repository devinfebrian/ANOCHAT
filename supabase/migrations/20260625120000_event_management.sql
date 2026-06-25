-- #008 Creator event management: track cancelled state + per-event management token.
-- cancelled_at: NULL = active; set when creator cancels. Keeps row readable for share links.
-- management_token_hash: sha256 hex of raw token held in creator's httpOnly cookie.
--   Verifies creator authorization for edit/cancel actions alongside the username cookie.
--   Service role bypasses RLS for writes; existing events_public_read SELECT policy unchanged.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz;

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "management_token_hash" text;

CREATE INDEX IF NOT EXISTS "events_cancelled_at_idx" ON "events" ("cancelled_at");

-- Credential hygiene: management_token_hash is a secret. The existing
-- events_public_read policy grants SELECT to anon/authenticated on every column.
-- Revoke column-level access to the secret column so it never leaks via the
-- Data API / PostgREST. Service role bypasses GRANT/RLS so app code is unaffected.
REVOKE SELECT ("management_token_hash") ON "events" FROM anon, authenticated;