# Clerk → Supabase Auth Migration Plan

## Overview

Migrate authentication from Clerk to Supabase Auth with Google sign-in provider.

**Current state:** Clerk handles auth. Supabase handles DB + Storage. User IDs stored as `text` (Clerk format `user_xxx`).

**Target state:** Supabase Auth handles everything. User IDs stored as `uuid` (Supabase Auth `auth.users.id`).

## Migration Phases

### Phase 1: Supabase Auth Setup (Dashboard)

**Prerequisites — do these first:**

1. Enable Google provider in Supabase Dashboard → Authentication → Providers → Google
2. Create OAuth credentials in Google Cloud Console:
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Set site URL in Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://<your-domain>.com`
   - Redirect URLs: `https://<your-domain.com>/auth/callback`
4. For local dev, update `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "your-google-client-id"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
   ```

### Phase 2: Code Migration

#### 2.1 — Dependencies

```bash
# Remove Clerk
bun remove @clerk/nextjs

# Supabase SSR already installed (@supabase/ssr). No new deps needed.
```

#### 2.2 — Environment Variables

**Remove from `.env.local` / `.env.example`:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Keep:**
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

**Add:**
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (for local dev only)

#### 2.3 — New Files

**`lib/supabase/client.ts`** — Browser Supabase client:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`lib/supabase/middleware.ts`** — Supabase SSR middleware helper:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

**`app/auth/callback/route.ts`** — OAuth callback handler:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/events";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

**`app/login/page.tsx`** — Login page (replaces Clerk `<SignIn>`):
- Google sign-in button using `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } })`
- Optional: email/password form using `supabase.auth.signInWithPassword()`

**`app/auth/signout/route.ts`** — Sign-out API route:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
}
```

#### 2.4 — Files to Modify

| File | Change |
|------|--------|
| `proxy.ts` | Replace Clerk middleware with Supabase SSR middleware |
| `lib/env.ts` | Remove Clerk env vars, keep Supabase ones |
| `lib/supabase/server.ts` | Replace `auth()` from Clerk with Supabase SSR `getUser()` |
| `app/layout.tsx` | Remove `ClerkProvider` |
| `components/profile/header-user-menu.tsx` | Replace `SignOutButton` with form POST to `/auth/signout` |
| `app/admin/actions.ts` | Replace `clerkClient()` with `supabase.auth.admin.*` |

#### 2.5 — Files to Delete

- `app/login/[[...rest]]/page.tsx` (Clerk catch-all route)
- `app/sign-up/[[...sign-up]]/page.tsx` (Clerk catch-all route)

#### 2.6 — Auth Helper Rewrite (`lib/supabase/server.ts`)

Replace Clerk's `auth()` with Supabase SSR:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

export type SessionUser = { id: string; email: string | null };

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
}

export const getServerSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
});

export const getServerProfile = cache(async (): Promise<Profile | null> => {
  const session = await getServerSession();
  if (!session) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.id))
    .limit(1);
  return rows[0] ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireProfile(): Promise<Profile> {
  const session = await requireUser();
  const profile = await getServerProfile();
  if (!profile) redirect("/claim-username");
  if (profile.userId !== session.id) redirect("/claim-username");
  return profile;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  const allowed = env.ADMIN_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  if (!allowed.includes(session.id)) redirect("/events");
  return session;
}

export function createServiceSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

#### 2.7 — Admin Actions Rewrite (`app/admin/actions.ts`)

Replace `clerkClient()` with Supabase admin API:

```ts
"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function listUsers() {
  await requireAdmin();
  const supabase = createServiceSupabase();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return { ok: false, error: error.message };
  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name: u.user_metadata?.full_name ?? "",
    banned: u.banned_until != null && new Date(u.banned_until) > new Date(),
    createdAt: new Date(u.created_at).getTime(),
  }));
  return { ok: true, data: users };
}

export async function banUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Cannot ban yourself." };
  const supabase = createServiceSupabase();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: "none", // permanent until unbanned
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function unbanUser(userId: string) {
  await requireAdmin();
  const supabase = createServiceSupabase();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Cannot delete yourself." };
  const supabase = createServiceSupabase();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
```

#### 2.8 — Middleware Rewrite (`proxy.ts`)

Replace Clerk middleware with Supabase SSR:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPaths = ["/login", "/auth"];
  const isPublic = publicPaths.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/events";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

export default proxy;
```

#### 2.9 — Layout Change (`app/layout.tsx`)

Remove `ClerkProvider` wrapper:

```tsx
// Before
<ClerkProvider signInUrl="/login" signUpUrl="/sign-up">
  <SiteHeader />
  <main className="flex-1">{children}</main>
  <SiteFooter />
</ClerkProvider>

// After
<SiteHeader />
<main className="flex-1">{children}</main>
<SiteFooter />
```

### Phase 3: Data Migration

**Critical: Run BEFORE deploying code changes.**

#### 3.1 — Export Clerk Users

Use Clerk's dashboard or API to export all users with:
- `id` (Clerk user ID: `user_xxx`)
- `email`
- `firstName`, `lastName`
- `createdAt`

#### 3.2 — Create Supabase Auth Users

For each Clerk user, create a Supabase Auth user via admin API:

```ts
// scripts/migrate-users.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Clerk users export (from Clerk dashboard CSV or API)
const clerkUsers = [
  { id: "user_xxx", email: "user@example.com", name: "John Doe" },
  // ...
];

const idMap: Record<string, string> = {};

for (const user of clerkUsers) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    email_confirm: true,
    user_metadata: { full_name: user.name },
  });
  if (error) {
    console.error(`Failed to create user ${user.email}:`, error);
    continue;
  }
  idMap[user.id] = data.user.id;
  console.log(`${user.id} → ${data.user.id}`);
}

// Output: { "user_xxx": "uuid-yyy", ... }
// Save this mapping for step 3.3
```

#### 3.3 — Update Database Records

Run SQL to update all user ID references:

```sql
-- Migration script: update user IDs
-- Run this as a transaction

BEGIN;

-- Step 1: Temporarily drop FK constraints
ALTER TABLE "event_attendees" DROP CONSTRAINT "event_attendees_user_id_profiles_user_id_fk";
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_user_id_profiles_user_id_fk";
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk";
ALTER TABLE "username_reservations" DROP CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk";

-- Step 2: Update profiles table
-- Map Clerk IDs → Supabase UUIDs
UPDATE "profiles" SET "user_id" = '<supabase-uuid>' WHERE "user_id" = 'user_xxx';
-- ... repeat for each user

-- Step 3: Update event_attendees
UPDATE "event_attendees" SET "user_id" = '<supabase-uuid>' WHERE "user_id" = 'user_xxx';

-- Step 4: Update events
UPDATE "events" SET "created_by_user_id" = '<supabase-uuid>' WHERE "created_by_user_id" = 'user_xxx';

-- Step 5: Update reports
UPDATE "reports" SET "reporter_user_id" = '<supabase-uuid>' WHERE "reporter_user_id" = 'user_xxx';

-- Step 6: Update username_reservations
UPDATE "username_reservations" SET "reserved_by" = '<supabase-uuid>' WHERE "reserved_by" = 'user_xxx';

-- Step 7: Change column types back to UUID
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
ALTER TABLE "event_attendees" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
ALTER TABLE "events" ALTER COLUMN "created_by_user_id" SET DATA TYPE uuid USING "created_by_user_id"::uuid;
ALTER TABLE "reports" ALTER COLUMN "reporter_user_id" SET DATA TYPE uuid USING "reporter_user_id"::uuid;
ALTER TABLE "username_reservations" ALTER COLUMN "reserved_by" SET DATA TYPE uuid USING "reserved_by"::uuid;

-- Step 8: Re-add FK constraints
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_profiles_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_profiles_user_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_profiles_user_id_fk"
  FOREIGN KEY ("reporter_user_id") REFERENCES "profiles"("user_id") ON DELETE cascade;
ALTER TABLE "username_reservations" ADD CONSTRAINT "username_reservations_reserved_by_profiles_user_id_fk"
  FOREIGN KEY ("reserved_by") REFERENCES "profiles"("user_id") ON DELETE set null;

-- Step 9: Re-add auth.users FK (enables RLS integration)
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

COMMIT;
```

#### 3.4 — Update Drizzle Schema

Change `userId` column types in `lib/db/schema.ts`:
- `profiles.userId`: `text` → `uuid`
- `eventAttendees.userId`: `text` → `uuid`
- `events.createdByUserId`: `text` → `uuid`
- `reports.reporterUserId`: `text` → `uuid`
- `usernameReservations.reservedBy`: `text` → `uuid`

### Phase 4: Deploy

1. **Deploy Supabase migration** (column type changes + data migration)
2. **Deploy Next.js code** (Clerk → Supabase Auth)
3. **Verify:**
   - Login with Google works
   - Existing users can sign in (they need to use Google OAuth with same email)
   - Profile loads correctly
   - Events/RSVPs work
   - Admin panel works

### Phase 5: Cleanup

1. Remove Clerk webhook endpoints (if any)
2. Delete Clerk project (after confirming migration works)
3. Remove `@clerk/nextjs` from dependencies
4. Update `.env.example`

## Rollback Plan

If migration fails:
1. Revert code changes (git revert)
2. Revert data migration (restore from backup)
3. Re-enable Clerk

**Take a full DB backup before running Phase 3.**

## Checklist

- [ ] Google OAuth configured in Supabase dashboard
- [ ] Google OAuth configured in Google Cloud Console
- [ ] Redirect URLs updated in Supabase dashboard
- [ ] Clerk users exported
- [ ] DB backup taken
- [ ] User migration script run
- [ ] Column types reverted to UUID
- [ ] Code changes deployed
- [ ] Login flow tested
- [ ] Existing user login tested
- [ ] Admin panel tested
- [ ] Clerk project cleaned up
