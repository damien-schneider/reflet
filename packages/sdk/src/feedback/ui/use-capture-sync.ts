import { useEffect } from "react";

const RESIZE_DEBOUNCE = 400;

/**
 * Calls `refresh` whenever the page the reporter is looking at changes shape:
 * SPA routes (which never fire popstate on push/replace — history methods must
 * be patched) and window resizes, debounced. Keeps the frozen screenshot and
 * page context describing what the reporter currently sees.
 */
export function useCaptureSync(enabled: boolean, refresh: () => void): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const history = window.history;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    const hadOwnPush = Object.hasOwn(history, "pushState");
    const hadOwnReplace = Object.hasOwn(history, "replaceState");

    history.pushState = function pushState(data, unused, url) {
      const result = originalPush.call(history, data, unused, url);
      refresh();
      return result;
    };
    history.replaceState = function replaceState(data, unused, url) {
      const result = originalReplace.call(history, data, unused, url);
      refresh();
      return result;
    };
    window.addEventListener("popstate", refresh);

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, RESIZE_DEBOUNCE);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (hadOwnPush) {
        history.pushState = originalPush;
      } else {
        Reflect.deleteProperty(history, "pushState");
      }
      if (hadOwnReplace) {
        history.replaceState = originalReplace;
      } else {
        Reflect.deleteProperty(history, "replaceState");
      }
      window.removeEventListener("popstate", refresh);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, refresh]);
}
