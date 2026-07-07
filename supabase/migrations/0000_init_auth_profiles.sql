CREATE TABLE "event_attendees" (
	"event_id" uuid NOT NULL,
	"username" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "event_attendees_event_id_username_pk" PRIMARY KEY("event_id","username"),
	CONSTRAINT "event_attendees_status_valid" CHECK ("event_attendees"."status" IN ('joining','interested','declined')),
	CONSTRAINT "event_attendees_note_length" CHECK (char_length(coalesce("event_attendees"."note", '')) <= 120),
	CONSTRAINT "event_attendees_username_format" CHECK (char_length("event_attendees"."username") BETWEEN 3 AND 20 AND "event_attendees"."username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$')
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"activity_type" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"location_text" text NOT NULL,
	"map_url" text,
	"max_participants" integer NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "events_max_participants_range" CHECK ("events"."max_participants" BETWEEN 2 AND 100),
	CONSTRAINT "events_activity_type_valid" CHECK ("events"."activity_type" IN ('hangout','sport','food','study','game','outdoor','travel','other')),
	CONSTRAINT "events_title_length" CHECK (char_length("events"."title") BETWEEN 1 AND 120),
	CONSTRAINT "events_location_text_length" CHECK (char_length("events"."location_text") BETWEEN 1 AND 200),
	CONSTRAINT "events_description_length" CHECK (char_length(coalesce("events"."description", '')) <= 1000),
	CONSTRAINT "events_map_url_length" CHECK (char_length(coalesce("events"."map_url", '')) <= 500),
	CONSTRAINT "events_created_by_format" CHECK (char_length("events"."created_by") BETWEEN 3 AND 20 AND "events"."created_by" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$')
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_format" CHECK (char_length("profiles"."username") BETWEEN 3 AND 20 AND "profiles"."username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$'),
	CONSTRAINT "profiles_display_name_length" CHECK (char_length("profiles"."display_name") BETWEEN 2 AND 20),
	CONSTRAINT "profiles_bio_length" CHECK (char_length(coalesce("profiles"."bio", '')) <= 500)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reporter_username" text NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_type_valid" CHECK ("reports"."target_type" IN ('event')),
	CONSTRAINT "reports_status_valid" CHECK ("reports"."status" IN ('open','reviewed','dismissed')),
	CONSTRAINT "reports_reason_length" CHECK (char_length("reports"."reason") BETWEEN 1 AND 280),
	CONSTRAINT "reports_reporter_username_format" CHECK (char_length("reports"."reporter_username") BETWEEN 3 AND 20 AND "reports"."reporter_username" ~ '^(?![._-]+$)[a-zA-Z0-9._-]+$')
);
--> statement-breakpoint
CREATE TABLE "username_reservations" (
	"username" text PRIMARY KEY NOT NULL,
	"reserved_until" timestamp with time zone NOT NULL,
	"reserved_by" uuid
);
--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_profiles_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "username_reservations" ADD CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk" FOREIGN KEY ("reserved_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_attendees_username_idx" ON "event_attendees" USING btree ("username");--> statement-breakpoint
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_attendees_event_user_active_unique" ON "event_attendees" USING btree ("event_id","user_id") WHERE "event_attendees"."status" <> 'declined';--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_created_by_user_id_idx" ON "events" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profiles_created_at_idx" ON "profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_reporter_user_id_idx" ON "reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_target_reporter_unique" ON "reports" USING btree ("target_id","reporter_user_id");--> statement-breakpoint
CREATE INDEX "username_reservations_reserved_until_idx" ON "username_reservations" USING btree ("reserved_until");--> statement-breakpoint

-- profiles.user_id → auth.users(id). Deletes a profile (and cascade) when the auth user is deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_auth_users_fk'
  ) THEN
    ALTER TABLE "profiles"
      ADD CONSTRAINT "profiles_user_id_auth_users_fk"
      FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;--> statement-breakpoint

-- Row Level Security: defense-in-depth. The app uses the service role (postgres-js),
-- which bypasses RLS, so anon/authenticated get default-deny on these tables.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "username_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_attendees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Capacity enforcement: blocks a 'joining' insert/switch when the event is at cap.
-- Self is excluded on UPDATE by user_id so re-affirming a 'joining' row at cap still passes.
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
        AND (TG_OP = 'INSERT' OR "user_id" <> NEW."user_id");
    IF current_count >= cap THEN
      RAISE EXCEPTION 'Event % is full (% / %)', NEW."event_id", current_count, cap
        USING ERRCODE = '45000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp;--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_enforce_event_capacity" ON "event_attendees";--> statement-breakpoint
CREATE TRIGGER "trg_enforce_event_capacity"
  BEFORE INSERT OR UPDATE OF "event_id", "status" ON "event_attendees"
  FOR EACH ROW EXECUTE FUNCTION "enforce_event_capacity"();--> statement-breakpoint

-- Public avatars bucket for profile uploads.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Storage RLS: public bucket serves objects via public URL without a SELECT policy,
-- so we omit the broad SELECT policy to prevent unknown clients from listing all files.
-- Only the owner may write/update/delete.
DROP POLICY IF EXISTS "avatars_public_read" ON "storage"."objects";--> statement-breakpoint
DROP POLICY IF EXISTS "avatars_owner_write" ON "storage"."objects";--> statement-breakpoint
CREATE POLICY "avatars_owner_write" ON "storage"."objects"
  FOR INSERT WITH CHECK ("bucket_id" = 'avatars' AND "owner_id" = auth.uid()::text);--> statement-breakpoint
DROP POLICY IF EXISTS "avatars_owner_update" ON "storage"."objects";--> statement-breakpoint
CREATE POLICY "avatars_owner_update" ON "storage"."objects"
  FOR UPDATE USING ("bucket_id" = 'avatars' AND "owner_id" = auth.uid()::text);--> statement-breakpoint
DROP POLICY IF EXISTS "avatars_owner_delete" ON "storage"."objects";--> statement-breakpoint
CREATE POLICY "avatars_owner_delete" ON "storage"."objects"
  FOR DELETE USING ("bucket_id" = 'avatars' AND "owner_id" = auth.uid()::text);