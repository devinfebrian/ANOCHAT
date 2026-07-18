# ADR-0002: Centralize Profile use cases in a Profile intake module

## Status

Accepted

## Context

Profile-related use cases — claim username, update profile, rename username, and avatar handling — were implemented directly in Next.js Server Actions and `lib/profile/queries.ts`. Each action repeated orchestration: FormData parsing, Supabase storage signed-URL generation, validation, multi-table rename transactions, cache-bust URL construction, and `revalidatePath`. There was no persistence seam: `lib/profile/queries.ts` mixed Drizzle calls, validation, transaction orchestration, and DB error mapping in one module. Tests would need a live Postgres plus a Supabase storage bucket. This mirrored the pre-ADR-0001 shape of Event intake.

## Decision

Introduce a deep `lib/profile/intake.ts` module that owns the full Profile intake lifecycle, paralleling ADR-0001. The Server Actions become thin adapters that:

1. Build a `ProfileIntakeContext` with the resolved Profile and a `ProfileStore` adapter.
2. Call the appropriate intake function.
3. Map the returned `ProfileIntakeResult` to action state.
4. Call `revalidatePath`/`redirect`.

Persistence moves behind a `ProfileStore` adapter (`lib/profile/store.ts`). The production adapter uses Drizzle and Supabase storage; tests use the same adapter against a test database. Avatar upload (signed URL, public URL, cache-bust) stays inside Profile intake because it shares the same auth and profile seams.

Rename cascades (`events.created_by`, `event_attendees.username`) are coordinated by `ProfileStore.renameUsername`, which calls `EventStore` cascade methods inside a shared transaction. This keeps each store's interface focused on its own tables while the rename transaction preserves atomicity.

## Consequences

- **Locality**: username reservation, rename cooldown, cascading updates, and avatar rules live in one module.
- **Leverage**: one `ProfileStore` interface serves claim, settings, and rename use cases.
- **Testability**: the intake module is tested with typed inputs against a test database, without Next.js form machinery.
- **AI-navigability**: a future reader understands an entire profile use case by reading `lib/profile/intake.ts` instead of chasing actions + `queries.ts`.
- **Trade-off**: the `ProfileStore` interface is wider than a single-purpose repository, but it represents the real persistence seam and the rename cascade justifies the `EventStore` dependency.
