export function isSafeRedirect(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return (
    path === "/events" ||
    path.startsWith("/events/") ||
    path === "/settings" ||
    path.startsWith("/settings/") ||
    path === "/claim-username"
  );
}

export function safeRedirect(path: string | null | undefined, fallback = "/events"): string {
  const normalized = (path ?? "").trim();
  return isSafeRedirect(normalized) ? normalized : fallback;
}
