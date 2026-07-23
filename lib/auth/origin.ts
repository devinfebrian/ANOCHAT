export function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  throw new Error("NEXT_PUBLIC_APP_URL is required in production");
}
