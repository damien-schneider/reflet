"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

const guestSessionSchema = z.object({
  guestEmail: z.string(),
  guestId: z.string(),
});

type GuestSession = z.infer<typeof guestSessionSchema>;

const listenersByKey = new Map<string, Set<() => void>>();
const snapshotCache = new Map<string, GuestSession | null>();

const getStorageKey = (orgSlug: string) => `support_guest_${orgSlug}`;

function parseSession(raw: string | null): GuestSession | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = guestSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// useSyncExternalStore requires a stable snapshot reference between changes
function readSession(key: string): GuestSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!snapshotCache.has(key)) {
    snapshotCache.set(key, parseSession(localStorage.getItem(key)));
  }
  return snapshotCache.get(key) ?? null;
}

function subscribe(key: string, onStoreChange: () => void) {
  const listeners = listenersByKey.get(key) ?? new Set();
  listeners.add(onStoreChange);
  listenersByKey.set(key, listeners);

  return () => {
    listeners.delete(onStoreChange);
  };
}

function writeSession(key: string, session: GuestSession | null) {
  if (session) {
    localStorage.setItem(key, JSON.stringify(session));
  } else {
    localStorage.removeItem(key);
  }
  snapshotCache.set(key, session);

  for (const listener of listenersByKey.get(key) ?? []) {
    listener();
  }
}

export function useGuestSession(orgSlug: string) {
  const key = getStorageKey(orgSlug);

  const session = useSyncExternalStore(
    (onStoreChange) => subscribe(key, onStoreChange),
    () => readSession(key),
    () => null
  );

  return {
    clearGuestSession: () => writeSession(key, null),
    guestEmail: session?.guestEmail ?? null,
    guestId: session?.guestId ?? null,
    saveGuestSession: (email: string) => {
      const guestId = readSession(key)?.guestId ?? crypto.randomUUID();
      writeSession(key, { guestEmail: email, guestId });
      return guestId;
    },
  };
}
