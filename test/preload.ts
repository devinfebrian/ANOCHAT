const env = process.env as Record<string, string | undefined>;

env.NODE_ENV = "test";

env.DATABASE_URL =
  env.TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5433/postgres";

env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "test-service-key";
