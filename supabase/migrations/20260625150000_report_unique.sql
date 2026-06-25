-- #009 follow-up: prevent duplicate reports + rate-limit evasion.
-- One report per (target, reporter) — unique index also serves admin "by target" queries
-- (leading columns target_type, target_id). Replaces the non-unique reports_target_idx.
-- Idempotent.

DROP INDEX IF EXISTS "reports_target_idx";

DROP INDEX IF EXISTS "reports_target_reporter_unique";
CREATE UNIQUE INDEX "reports_target_reporter_unique"
  ON "reports" ("target_type", "target_id", "reporter_username");
