import { useCallback, useEffect, useRef, useState } from "react";
import { reportFailure } from "../../../devtools/client/notices";
import { failureMessage } from "../../../sessions/ui/session-workspace";
import {
  LIVE_HUB_ENDPOINTS,
  type LiveConnections,
  liveConnectionsSchema,
} from "../../protocol";
import { callHub } from "./hub-client";

const CONNECTION_KEY = "reflet-live-connection";

export type LiveConnection = LiveConnections["connections"][number];

export type ConnectionsState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "failed"; message: string }
  | { kind: "ready"; connections: LiveConnection[]; selectedId: string };

function readRememberedId(): string | null {
  try {
    return localStorage.getItem(CONNECTION_KEY);
  } catch {
    return null;
  }
}

function rememberId(id: string): boolean {
  try {
    localStorage.setItem(CONNECTION_KEY, id);
    return true;
  } catch {
    return false;
  }
}

function postChoice(id: string): Promise<LiveConnections> {
  return callHub(LIVE_HUB_ENDPOINTS.connection, liveConnectionsSchema, { id });
}

function preferredId(
  listed: LiveConnections,
  current: string | null
): string | null {
  const ids = new Set(listed.connections.map((connection) => connection.id));
  return (
    [current, readRememberedId(), listed.selectedId].find(
      (id) => id !== null && ids.has(id)
    ) ??
    listed.connections[0]?.id ??
    null
  );
}

async function chooseConnection(
  current: string | null
): Promise<{ id: string; listed: LiveConnections } | null> {
  const listed = await callHub(
    LIVE_HUB_ENDPOINTS.connections,
    liveConnectionsSchema
  );
  const id = preferredId(listed, current);
  return id === null ? null : { id, listed: await postChoice(id) };
}

export function useHubConnections(epoch: number): {
  select: (id: string) => Promise<void>;
  state: ConnectionsState;
} {
  const [state, setState] = useState<ConnectionsState>({ kind: "loading" });
  const selectedRef = useRef<string | null>(null);
  const latestLoad = useRef(0);

  const confirm = useCallback((listed: LiveConnections, id: string) => {
    selectedRef.current = id;
    rememberId(id);
    setState({
      connections: listed.connections,
      kind: "ready",
      selectedId: id,
    });
  }, []);

  const load = useCallback(async () => {
    latestLoad.current += 1;
    const thisLoad = latestLoad.current;
    try {
      const chosen = await chooseConnection(selectedRef.current);
      if (thisLoad !== latestLoad.current) {
        return;
      }
      if (chosen) {
        confirm(chosen.listed, chosen.id);
      } else {
        selectedRef.current = null;
        setState({ kind: "empty" });
      }
    } catch (error) {
      if (thisLoad === latestLoad.current && selectedRef.current === null) {
        setState({ kind: "failed", message: failureMessage(error) });
      }
    }
  }, [confirm]);

  useEffect(() => {
    if (epoch > 0) {
      load();
    }
  }, [epoch, load]);

  const isEmpty = state.kind === "empty";
  useEffect(() => {
    if (!isEmpty) {
      return;
    }
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [isEmpty, load]);

  const select = useCallback(
    async (id: string) => {
      try {
        confirm(await postChoice(id), id);
      } catch (error) {
        reportFailure("The organization was not switched", error);
      }
    },
    [confirm]
  );

  return { select, state };
}
