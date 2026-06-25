-- ANOCHAT foundation: events table
-- Enable RLS by default (Supabase security: exposed schema)

CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "events_slug_idx" ON "events" ("slug");

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;