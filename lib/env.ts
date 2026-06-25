import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid Postgres connection string")
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must start with postgresql:// or postgres://"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${errors}\n\nCheck .env.local against .env.example`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();