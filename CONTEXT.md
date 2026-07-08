# ANOCHAT domain glossary

Terms used by the codebase and architecture reviews.

- **Event** — a public meetup created by a user. Has a title, activity type, start time, location, optional map URL, capacity, description, and cancellation state.
- **Event intake** — the use cases that create, edit, cancel, RSVP to, and report Events.
- **RSVP** — a user's response to an Event: `joining`, `interested`, or `declined`.
- **Attendee** — a user who has RSVPed to an Event.
- **Capacity** — the maximum number of `joining` Attendees an Event allows, enforced by a database trigger.
- **Slug** — a unique, shareable identifier for an Event derived from its title.
- **Management token** — a per-Event secret stored in a path-scoped httpOnly cookie and verified by a SHA-256 hash to authorize edits and cancellation by the creator.
- **Report** — a moderation request filed against an Event by a user.
- **Username** — a public, device-bound display name. Must match `USERNAME_PATTERN`.
- **Device** — an anonymous browser identity represented by a raw token in an httpOnly cookie and a SHA-256 device hash used server-side.
- **Identity session** — the combination of Device, Username (via `user_accounts`), and client-side storage that represents the current user.
- **Rate limit** — a sliding-window count of actions (event creation, reporting) per Device.
- **EventStore adapter** — the persistence seam behind Event intake. Production implementation uses Drizzle; tests can use an in-memory substitute.
- **Event intake context** — the request-scoped dependencies passed into Event intake: current Username, Device hash, time, EventStore adapter, manager-cookie adapter, and rate-limit checks.
- **Event intake result** — a discriminated result type carrying either a success value or a domain error such as `not_authenticated`, `event_full`, or `not_manager`.
- **Profile** — a user's public identity: username, display name, bio, avatar URL, and links.
- **ProfileStore adapter** — the persistence seam behind Profile intake. Production implementation uses Drizzle; tests can use a test database substitute.
- **Profile intake** — the use cases that create, update, and rename Profiles, including avatar URL handling.
- **Profile intake context** — the request-scoped dependencies passed into Profile intake: current Profile, time, and ProfileStore adapter.
- **Profile intake result** — a discriminated result type carrying either a success value or a domain error such as `not_authenticated`, `profile_not_found`, `username_taken`, or `invalid_username`.
