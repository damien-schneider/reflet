import { useEffect, useState, useSyncExternalStore } from "react";

const claims = new Map<symbol, { hasWidget: boolean }>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentOwner(): symbol | undefined {
  for (const [token, claim] of claims) {
    if (claim.hasWidget) {
      return token;
    }
  }
  return claims.keys().next().value;
}

/**
 * One devtools bar per page, however many RefletFeedback instances mount:
 * the one with a visible widget wins, so its bar can step aside for its panel.
 */
export function useOwnsDevtools(wantsDevtools: boolean, hasWidget: boolean) {
  const [token] = useState(() => Symbol("reflet-devtools"));

  useEffect(() => {
    if (!wantsDevtools) {
      return;
    }
    claims.set(token, { hasWidget });
    notify();
    return () => {
      claims.delete(token);
      notify();
    };
  }, [hasWidget, token, wantsDevtools]);

  return useSyncExternalStore(
    subscribe,
    () => currentOwner() === token,
    () => false
  );
}
