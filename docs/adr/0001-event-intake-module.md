# ADR-0001: Centralize Event use cases in an Event intake module

## Status

Accepted

## Context

Event-related use cases — create, edit, cancel, RSVP, and report — were implemented directly in Next.js Server Actions. Each action repeated the same orchestration:

- Resolving the current user and device.
- Checking rate limits.
- Validating input.
- Converting local time to UTC.
- Verifying the management token.
- Running database transactions.
- Mapping database errors to user-facing messages.
- Calling `revalidatePath` and `redirect`.

This made the actions shallow: their interface was almost as wide as their implementation. Understanding a single use case required bouncing between `app/events/*/actions.ts`, `lib/events/queries.ts`, `lib/events/management.ts`, `lib/events/rate-limit.ts`, and `lib/reports/rate-limit.ts`. Tests would have to exercise Server Actions through `FormData`, which is awkward and slow.

## Decision

Introduce a deep `lib/events/intake.ts` module that owns the full Event intake lifecycle. The Server Actions become thin adapters that:

1. Parse `FormData` using the existing Zod schemas.
2. Build an `EventIntakeContext` with request-scoped dependencies.
3. Call the appropriate intake function.
4. Map the returned `EventIntakeResult` to action state.
5. Call `revalidatePath`/`redirect`.

Persistence moves behind an `EventStore` adapter (`lib/events/store.ts`). The production adapter uses Drizzle; tests can plug in an in-memory implementation. Public and management read projections are separated so that public pages never receive `managementTokenHash` or `creatorDeviceHash`.

Reporting an Event is kept inside Event intake because it is triggered by an Event context and shares the same auth/rate-limit seams.

## Consequences

- **Locality**: business rules, error handling, and transaction orchestration live in one module.
- **Leverage**: one interface serves all Event intake use cases.
- **Testability**: the deep module can be unit-tested with typed inputs and a fake `EventStore`, without Next.js form machinery.
- **AI-navigability**: a future reader can understand an entire use case by reading `lib/events/intake.ts` instead of chasing five files.
- **Trade-off**: the `EventStore` interface is wider than a single-purpose repository, but it represents the real persistence seam and has two adapters (production + in-memory test), so the seam is justified.
