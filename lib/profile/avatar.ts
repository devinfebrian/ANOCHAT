const PALETTE = [
  "#fde68a",
  "#fca5a5",
  "#f9a8d4",
  "#c4b5fd",
  "#a5b4fc",
  "#93c5fd",
  "#7dd3fc",
  "#86efac",
  "#bef264",
  "#fdba74",
] as const;

function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getInitials(username: string): string {
  const stripped = username.replace(/[._-]+/g, "").trim();
  if (!stripped) return "?";
  const first = stripped[0]!;
  if (stripped.length === 1) return first.toUpperCase();
  const last = stripped[stripped.length - 1]!;
  return (first + last).toUpperCase();
}

export function getAvatarColor(username: string): string {
  return PALETTE[hash(username) % PALETTE.length]!;
}
