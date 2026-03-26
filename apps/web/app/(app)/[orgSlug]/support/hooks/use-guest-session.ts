"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

interface GuestSession {
  guestEmail: string;
  guestId: string;
}

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateGuestId(): string {
  let result = "guest_";
  for (let i = 0; i < 12; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function getStorageKey(orgSlug: string): string {
  return `support_guest_${orgSlug}`;
}

function readSession(orgSlug: string): GuestSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(getStorageKey(orgSlug));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as GuestSession;
  } catch {
    return null;
  }
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function useGuestSession(orgSlug: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.push(onStoreChange);
    return () => {
      listeners = listeners.filter((l) => l !== onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => readSession(orgSlug), [orgSlug]);
  const getServerSnapshot = useCallback(() => null, []);

  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const saveGuestSession = useCallback(
    (email: string) => {
      const existing = readSession(orgSlug);
      const guestId = existing?.guestId ?? generateGuestId();
      const data: GuestSession = { guestId, guestEmail: email };
      localStorage.setItem(getStorageKey(orgSlug), JSON.stringify(data));
      emitChange();
      return guestId;
    },
    [orgSlug]
  );

  const clearGuestSession = useCallback(() => {
    localStorage.removeItem(getStorageKey(orgSlug));
    emitChange();
  }, [orgSlug]);

  return useMemo(
    () => ({
      guestId: session?.guestId ?? null,
      guestEmail: session?.guestEmail ?? null,
      saveGuestSession,
      clearGuestSession,
    }),
    [session, saveGuestSession, clearGuestSession]
  );
}
