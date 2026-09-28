import { useCallback, useEffect, useRef, useState } from "react";
import type { DevtoolsStatus } from "../../protocol";
import { probeDevRoute } from "./dev-route";

export type DevRouteState =
  | { kind: "checking" }
  | { kind: "missing" }
  | { kind: "ready"; status: DevtoolsStatus };

/** Re-probes on window focus so a connection finished in another tab shows up; keeps the last state meanwhile. */
export function useDevRoute(): { refresh: () => void; route: DevRouteState } {
  const [route, setRoute] = useState<DevRouteState>({ kind: "checking" });
  const latestProbe = useRef(0);

  const refresh = useCallback(() => {
    latestProbe.current += 1;
    const probe = latestProbe.current;
    probeDevRoute().then((status) => {
      if (probe === latestProbe.current) {
        setRoute(status ? { kind: "ready", status } : { kind: "missing" });
      }
    });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      latestProbe.current += 1;
    };
  }, [refresh]);

  return { refresh, route };
}
