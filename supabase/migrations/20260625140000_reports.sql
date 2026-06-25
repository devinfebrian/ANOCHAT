-- #009 Basic abuse and data validation: reports table for admin review stub.
-- Generic target shape so future report types (attendee, note) extend without rewrite.
-- RLS enabled with no SELECT policy => default-deny anon/authenticated (service role bypasses).
-- Matches event_attendees lockdown pattern from 20260625082000.

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "reporter_username" text NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_target_type_valid";
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_type_valid"
  CHECK ("target_type" IN ('event'));

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_status_valid";
ALTER TABLE "reports" ADD CONSTRAINT "reports_status_valid"
  CHECK ("status" IN ('open','reviewed','dismissed'));

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_reason_length";
ALTER TABLE "reports" ADD CONSTRAINT "reports_reason_length"
  CHECK (char_length("reason") BETWEEN 1 AND 280);

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_reporter_username_format";
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_username_format"
  CHECK (char_length("reporter_username") BETWEEN 3 AND 20
    AND "reporter_username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$');

CREATE INDEX IF NOT EXISTS "reports_target_idx" ON "reports" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports" ("status");

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
