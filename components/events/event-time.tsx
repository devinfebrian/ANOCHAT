"use client";

const fmt = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function EventTime({ date }: { date: Date | string }) {
  const value = typeof date === "string" ? new Date(date) : date;
  return (
    <time suppressHydrationWarning dateTime={value.toISOString()}>
      {fmt.format(value)}
    </time>
  );
}
