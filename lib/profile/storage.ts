import { usernameSchema, type Username } from "./schema";

export const USERNAME_STORAGE_KEY = "anochat:username";

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(USERNAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USERNAME_STORAGE_KEY, value);
  } catch {
    // storage unavailable (private mode, quota); ignore — user stays anonymous
  }
}

function clearRaw(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USERNAME_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadUsername(): Username | null {
  const raw = readRaw();
  if (!raw) return null;
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    clearRaw();
    return null;
  }
  return parsed.data;
}

export function saveUsername(value: Username): void {
  writeRaw(value);
}

export function clearUsername(): void {
  clearRaw();
}
