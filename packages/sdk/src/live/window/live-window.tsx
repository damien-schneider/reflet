import type { ReactNode } from "react";
import { DEVTOOLS_STYLES } from "../../devtools/client/devtools-styles";
import { Notices } from "../../devtools/client/notices";
import { SESSIONS_STYLES } from "../../sessions/ui/sessions-styles";
import {
  type ConnectionsState,
  useHubConnections,
} from "./hub-link/use-hub-connections";
import { type HubStream, useHubStream } from "./hub-link/use-hub-stream";
import { LiveActivity } from "./live-activity";
import { LIVE_WINDOW_STYLES } from "./live-window-styles";
import { IdleStateReport, LiveRecorder } from "./recorder/live-recorder";

const STYLES = `${DEVTOOLS_STYLES}${SESSIONS_STYLES}${LIVE_WINDOW_STYLES}`;

function WindowFrame({ children }: { children: ReactNode }) {
  return (
    <div className="dt lw">
      <style>{STYLES}</style>
      <h1 className="lw-title">Reflet Live</h1>
      {children}
      <Notices />
    </div>
  );
}

function ConnectionSection({
  connections,
  onSelect,
  stream,
}: {
  connections: ConnectionsState;
  onSelect: (id: string) => void;
  stream: HubStream;
}) {
  if (connections.kind === "ready") {
    return (
      <LiveRecorder
        commands={stream.commands}
        connections={connections.connections}
        epoch={stream.epoch}
        key={connections.selectedId}
        onSelect={onSelect}
        selectedId={connections.selectedId}
      />
    );
  }
  return (
    <>
      <IdleStateReport epoch={stream.epoch} />
      {connections.kind === "empty" && (
        <p className="dt-hint">
          Connect Reflet from any app's devtools panel (footer → Connect), then
          come back here.
        </p>
      )}
      {connections.kind === "failed" && (
        <p className="dt-error">{connections.message}</p>
      )}
      {connections.kind === "loading" && stream.link !== "lost" && (
        <p className="dt-meta">Connecting to Reflet Live…</p>
      )}
    </>
  );
}

export function LiveWindow() {
  const stream = useHubStream();
  const { select, state } = useHubConnections(stream.epoch);

  if (stream.link === "elsewhere") {
    return (
      <WindowFrame>
        <p className="dt-hint">
          Reflet Live is open in another window: use that one and close this
          tab.
        </p>
      </WindowFrame>
    );
  }
  return (
    <WindowFrame>
      {stream.link === "lost" && (
        <p className="lw-banner" role="status">
          Reflet Live stopped in the terminal: run npx reflet-cli live again.
        </p>
      )}
      <ConnectionSection
        connections={state}
        onSelect={select}
        stream={stream}
      />
      <LiveActivity activity={stream.activity} />
    </WindowFrame>
  );
}
