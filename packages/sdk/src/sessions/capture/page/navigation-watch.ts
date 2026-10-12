import type { Frame } from "../../protocol";
import { captureFrame } from "../element-ref";

const URL_POLL_INTERVAL_MS = 500;

export interface NavigationWatch {
  stop: () => void;
}

/** SPA routers change the URL without an event, so the URL is also polled. */
export function startNavigationWatch(options: {
  onNavigate: (frame: Frame) => void;
}): NavigationWatch {
  const controller = new AbortController();
  let knownHref = window.location.href;
  const check = () => {
    if (window.location.href === knownHref) {
      return;
    }
    knownHref = window.location.href;
    options.onNavigate(captureFrame());
  };
  const poll = window.setInterval(check, URL_POLL_INTERVAL_MS);
  window.addEventListener("popstate", check, { signal: controller.signal });
  window.addEventListener("hashchange", check, { signal: controller.signal });
  return {
    stop: () => {
      window.clearInterval(poll);
      controller.abort();
    },
  };
}
