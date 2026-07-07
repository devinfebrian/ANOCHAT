import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_PATTERN = /^(?![._-]+$)[a-zA-Z0-9._-]+$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(
    USERNAME_PATTERN,
    "Username may only contain letters, numbers, dot, underscore, and dash",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name must be at least 2 characters")
  .max(20, "Display name must be at most 20 characters");

export const bioSchema = z
  .string()
  .trim()
  .max(500, "Bio must be at most 500 characters")
  .optional()
  .or(z.literal(""));

export const profileLinkSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(40, "Label is too long"),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("URL must be valid")
    .max(500, "URL is too long"),
});

export const profileLinksSchema = z
  .array(profileLinkSchema)
  .max(5, "You can add at most 5 links");

export type Username = z.infer<typeof usernameSchema>;
export type DisplayName = z.infer<typeof displayNameSchema>;
export type ProfileLink = z.infer<typeof profileLinkSchema>;