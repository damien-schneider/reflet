import { useEffect, useState } from "react";
import type { DevtoolsStatus } from "../../protocol";
import { probeDevRoute } from "./dev-route";

export type DevRouteState =
  | { kind: "checking" }
  | { kind: "missing" }
  | { kind: "ready"; status: DevtoolsStatus };

export function useDevRoute(): DevRouteState {
  const [state, setState] = useState<DevRouteState>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    probeDevRoute().then((status) => {
      if (active) {
        setState(status ? { kind: "ready", status } : { kind: "missing" });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
