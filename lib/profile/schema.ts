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

export type Username = z.infer<typeof usernameSchema>;
