import { useEffect, useState, useSyncExternalStore } from "react";

function createPageOwnership(name: string) {
  const claims = new Map<symbol, { hasWidget: boolean }>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const currentOwner = (): symbol | undefined => {
    for (const [token, claim] of claims) {
      if (claim.hasWidget) {
        return token;
      }
    }
    return claims.keys().next().value;
  };

  function useOwns(wants: boolean, hasWidget: boolean) {
    const [token] = useState(() => Symbol(name));

    useEffect(() => {
      if (!wants) {
        return;
      }
      claims.set(token, { hasWidget });
      notify();
      return () => {
        claims.delete(token);
        notify();
      };
    }, [hasWidget, token, wants]);

    return useSyncExternalStore(
      subscribe,
      () => currentOwner() === token,
      () => false
    );
  }

  function useIsClaimed() {
    return useSyncExternalStore(
      subscribe,
      () => claims.size > 0,
      () => false
    );
  }

  return { useIsClaimed, useOwns };
}

const devtoolsOwnership = createPageOwnership("reflet-devtools");
const teamToolsOwnership = createPageOwnership("reflet-team-tools");

export const useOwnsDevtools = devtoolsOwnership.useOwns;
export const useHasDevtoolsOnPage = devtoolsOwnership.useIsClaimed;
export const useOwnsTeamTools = teamToolsOwnership.useOwns;
