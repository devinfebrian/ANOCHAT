import { z } from "zod";
import { REPORT_TARGET_TYPES } from "@/lib/db/schema";
import { usernameSchema } from "@/lib/profile/schema";

const MAX_REASON = 280;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z
    .string()
    .min(1, "Target is required")
    .regex(UUID_RE, "Invalid target id"),
  reporterUsername: usernameSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(MAX_REASON, `Reason must be at most ${MAX_REASON} characters`),
});

export type ReportValues = z.infer<typeof reportSchema>;

export const REPORT_LIMITS = { MAX_REASON } as const;
