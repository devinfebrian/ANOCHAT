ALTER TABLE "event_attendees" DROP CONSTRAINT "event_attendees_user_id_profiles_user_id_fk";--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_user_id_profiles_user_id_fk";--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk";--> statement-breakpoint
ALTER TABLE "username_reservations" DROP CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "event_attendees" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_by_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "reporter_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "username_reservations" ALTER COLUMN "reserved_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_profiles_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "username_reservations" ADD CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk" FOREIGN KEY ("reserved_by") REFERENCES "profiles"("user_id") ON DELETE set null;--> statement-breakpoint
DROP TABLE "account";--> statement-breakpoint
DROP TABLE "session";--> statement-breakpoint
DROP TABLE "user";--> statement-breakpoint
DROP TABLE "verification";
