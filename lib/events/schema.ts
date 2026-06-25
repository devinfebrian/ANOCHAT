import { z } from "zod";
import { ACTIVITY_TYPES } from "@/lib/db/schema";
import { usernameSchema } from "@/lib/profile/schema";

const MIN_TITLE = 1;
const MAX_TITLE = 120;
const MAX_LOCATION = 200;
const MAX_DESCRIPTION = 1000;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 100;

const GOOGLE_MAPS_RE = /^https?:\/\/(maps\.app\.goo\.gl\/[\w./?=&-]+|[a-z0-9-]+\.google\.com\/maps\/[\w./?=&%-]*)$/i;

export const eventFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(MIN_TITLE, "Title is required")
    .max(MAX_TITLE, `Title must be at most ${MAX_TITLE} characters`),
  activityType: z.enum(ACTIVITY_TYPES, { error: "Pick an activity" }),
  startsAt: z
    .string()
    .min(1, "Date and time are required")
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    }, "Invalid date and time"),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone"),
  locationText: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(MAX_LOCATION, `Location must be at most ${MAX_LOCATION} characters`),
  mapUrl: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || GOOGLE_MAPS_RE.test(value),
      "Map URL must be a Google Maps link (maps.google.com or maps.app.goo.gl)",
    ),
  maxParticipants: z
    .coerce
    .number()
    .int("Must be a whole number")
    .min(MIN_PARTICIPANTS, `At least ${MIN_PARTICIPANTS} participants`)
    .max(MAX_PARTICIPANTS, `At most ${MAX_PARTICIPANTS} participants`),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION, `Description must be at most ${MAX_DESCRIPTION} characters`)
    .optional()
    .or(z.literal("")),
  createdBy: usernameSchema,
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const EVENT_FORM_LIMITS = {
  MIN_TITLE,
  MAX_TITLE,
  MAX_LOCATION,
  MAX_DESCRIPTION,
  MIN_PARTICIPANTS,
  MAX_PARTICIPANTS,
} as const;

export function eventFormValuesFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    activityType: String(formData.get("activityType") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    locationText: String(formData.get("locationText") ?? ""),
    mapUrl: String(formData.get("mapUrl") ?? ""),
    maxParticipants: formData.get("maxParticipants"),
    description: String(formData.get("description") ?? ""),
  };
}
