import { useEffect } from "react";

/**
 * Calls `refresh` whenever the app navigates client-side while it is active.
 *
 * SPA routes never fire popstate on push/replace — patching history methods is
 * the only way to keep screenshot and URL describing the same page while the
 * reporter is composing.
 */
export function useRouteSync(enabled: boolean, refresh: () => void): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(data, unused, url) {
      const result = originalPush(data, unused, url);
      refresh();
      return result;
    };
    window.history.replaceState = function replaceState(data, unused, url) {
      const result = originalReplace(data, unused, url);
      refresh();
      return result;
    };
    window.addEventListener("popstate", refresh);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("popstate", refresh);
    };
  }, [enabled, refresh]);
}
