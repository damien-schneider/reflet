import type { ChangelogEntry } from "./types";

const STORAGE_KEY_PREFIX = "reflet_changelog_seen_";

function storageKey(publicKey: string): string {
  return `${STORAGE_KEY_PREFIX}${publicKey}`;
}

function withStorage<T>(access: () => T, fallback: T): T {
  try {
    return access();
  } catch {
    return fallback;
  }
}

export function readLastSeen(publicKey: string): number {
  return withStorage(() => {
    const stored = localStorage.getItem(storageKey(publicKey));
    return stored ? Number(stored) : 0;
  }, 0);
}

export function writeLastSeen(publicKey: string, timestamp: number): void {
  withStorage(
    () => localStorage.setItem(storageKey(publicKey), String(timestamp)),
    undefined
  );
}

export function latestTimestamp(entries: ChangelogEntry[]): number {
  let latest = 0;
  for (const entry of entries) {
    if (entry.publishedAt && entry.publishedAt > latest) {
      latest = entry.publishedAt;
    }
  }
  return latest;
}

export function countUnread(
  entries: ChangelogEntry[],
  lastSeen: number
): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.publishedAt && entry.publishedAt > lastSeen) {
      count++;
    }
  }
  return count;
}
