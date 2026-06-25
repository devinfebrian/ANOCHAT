// Convert a local wall-clock string (e.g. "2026-06-25T19:30") interpreted in the
// given IANA timezone into a UTC Date. Naive: parse as if UTC, then slide by the
// resolved offset so the displayed wall-clock matches the user's intent.
export function zonedTimeToUtc(isoLocal: string, timeZone: string): Date {
  const asIfUtc = new Date(`${isoLocal}Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(asIfUtc).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  const asZoneUtc = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  );
  const offsetMs = asZoneUtc.getTime() - asIfUtc.getTime();
  return new Date(asIfUtc.getTime() - offsetMs);
}