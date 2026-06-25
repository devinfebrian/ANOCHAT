"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { syncUsernameCookie } from "./sync-action";
import { usernameSchema, type Username } from "./schema";
import {
  clearUsername as clearStored,
  loadUsername,
  saveUsername as saveStored,
  USERNAME_STORAGE_KEY,
} from "./storage";

type UsernameContextValue = {
  username: Username | null;
  ready: boolean;
  setUsername: (value: string) => Username;
  clear: () => void;
};

const UsernameContext = createContext<UsernameContextValue | null>(null);

const HYDRATING = Symbol("anochat:hydrating");
type Snapshot = Username | null | typeof HYDRATING;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  return loadUsername();
}

function getServerSnapshot(): Snapshot {
  return HYDRATING;
}

function emit(): void {
  for (const l of listeners) l();
}

export function UsernameProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = snapshot !== HYDRATING;
  const username = ready ? snapshot : null;

  const setUsername = useCallback((value: string): Username => {
    const parsed = usernameSchema.safeParse(value);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid username";
      throw new Error(message);
    }
    saveStored(parsed.data);
    void syncUsernameCookie(parsed.data);
    emit();
    return parsed.data;
  }, []);

  const clear = useCallback(() => {
    clearStored();
    void syncUsernameCookie(null);
    emit();
  }, []);

  const value = useMemo<UsernameContextValue>(
    () => ({ username, ready, setUsername, clear }),
    [username, ready, setUsername, clear],
  );

  return (
    <UsernameContext.Provider value={value}>
      {children}
    </UsernameContext.Provider>
  );
}

export function useUsername(): UsernameContextValue {
  const ctx = useContext(UsernameContext);
  if (!ctx) {
    throw new Error("useUsername must be used inside <UsernameProvider>");
  }
  return ctx;
}

export { USERNAME_STORAGE_KEY };
