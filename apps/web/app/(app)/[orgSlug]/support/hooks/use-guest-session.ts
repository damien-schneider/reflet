"use client";

import { useSyncExternalStore } from "react";

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
  const subscribe = (onStoreChange: () => void) => {
    listeners.push(onStoreChange);
    return () => {
      listeners = listeners.filter((l) => l !== onStoreChange);
    };
  };

  const getSnapshot = () => readSession(orgSlug);
  const getServerSnapshot = () => null;

  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const saveGuestSession = (email: string) => {
    const existing = readSession(orgSlug);
    const guestId = existing?.guestId ?? generateGuestId();
    const data: GuestSession = { guestId, guestEmail: email };
    localStorage.setItem(getStorageKey(orgSlug), JSON.stringify(data));
    emitChange();
    return guestId;
  };

  const clearGuestSession = () => {
    localStorage.removeItem(getStorageKey(orgSlug));
    emitChange();
  };

  return {
    guestId: session?.guestId ?? null,
    guestEmail: session?.guestEmail ?? null,
    saveGuestSession,
    clearGuestSession,
  };
}
