"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  claimUsername,
  removeAccount,
  renameUsername,
  type AccountResult,
} from "./accounts";
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
  claim: (value: string) => Promise<AccountResult>;
  rename: (value: string) => Promise<AccountResult>;
  remove: () => Promise<{ ok: true } | { ok: false; error: string }>;
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

  const claim = useCallback(
    async (value: string): Promise<AccountResult> => {
      const parsed = usernameSchema.safeParse(value);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };
      }
      const result = await claimUsername(parsed.data);
      if (result.ok) {
        saveStored(result.username);
        emit();
      }
      return result;
    },
    [],
  );

  const rename = useCallback(
    async (value: string): Promise<AccountResult> => {
      const parsed = usernameSchema.safeParse(value);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };
      }
      const result = await renameUsername(parsed.data);
      if (result.ok) {
        saveStored(result.username);
        emit();
      }
      return result;
    },
    [],
  );

  const remove = useCallback(async () => {
    const result = await removeAccount();
    if (result.ok) {
      clearStored();
      emit();
    }
    return result;
  }, []);

  const value = useMemo<UsernameContextValue>(
    () => ({ username, ready, claim, rename, remove }),
    [username, ready, claim, rename, remove],
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
