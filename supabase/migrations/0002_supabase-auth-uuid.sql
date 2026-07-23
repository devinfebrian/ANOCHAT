-- Clerk → Supabase Auth migration: revert user_id columns from text to uuid
-- Run AFTER creating Supabase Auth users and mapping Clerk IDs → Supabase UUIDs

BEGIN;

-- Step 1: Drop FK constraints
ALTER TABLE "event_attendees" DROP CONSTRAINT IF EXISTS "event_attendees_user_id_profiles_user_id_fk";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_created_by_user_id_profiles_user_id_fk";
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_reporter_user_id_profiles_user_id_fk";
ALTER TABLE "username_reservations" DROP CONSTRAINT IF EXISTS "username_reservations_reserved_by_profiles_user_id_fk";

-- Step 2: Drop auth.users FK if it exists (will be re-added after type change)
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_user_id_auth_users_fk";

-- Step 3: Update user IDs
-- Replace 'user_xxx' with the Clerk user ID, '<supabase-uuid>' with the Supabase Auth UUID
-- Example:
-- UPDATE "profiles" SET "user_id" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE "user_id" = 'user_abc123';
-- UPDATE "event_attendees" SET "user_id" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE "user_id" = 'user_abc123';
-- UPDATE "events" SET "created_by_user_id" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE "created_by_user_id" = 'user_abc123';
-- UPDATE "reports" SET "reporter_user_id" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE "reporter_user_id" = 'user_abc123';
-- UPDATE "username_reservations" SET "reserved_by" = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE "reserved_by" = 'user_abc123';

-- Step 4: Change column types from text to uuid
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
ALTER TABLE "event_attendees" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
ALTER TABLE "events" ALTER COLUMN "created_by_user_id" SET DATA TYPE uuid USING "created_by_user_id"::uuid;
ALTER TABLE "reports" ALTER COLUMN "reporter_user_id" SET DATA TYPE uuid USING "reporter_user_id"::uuid;
ALTER TABLE "username_reservations" ALTER COLUMN "reserved_by" SET DATA TYPE uuid USING "reserved_by"::uuid;

-- Step 5: Re-add FK constraints
ALTER TABLE "event_attendees"
  ADD CONSTRAINT "event_attendees_user_id_profiles_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;

ALTER TABLE "events"
  ADD CONSTRAINT "events_created_by_user_id_profiles_user_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk"
  FOREIGN KEY ("reporter_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;

ALTER TABLE "username_reservations"
  ADD CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk"
  FOREIGN KEY ("reserved_by") REFERENCES "profiles"("user_id") ON DELETE set null;

-- Step 6: Re-add auth.users FK (enables RLS integration with Supabase Auth)
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

COMMIT;
