import { DialNotice } from "./floating-dial/dial/dial-notice";
import { WaitingDial } from "./floating-dial/floating-dial";
import {
  type ConnectionsState,
  useHubConnections,
} from "./hub-link/use-hub-connections";
import { type HubStream, useHubStream } from "./hub-link/use-hub-stream";
import { IdleStateReport, LiveRecorder } from "./recorder/live-recorder";
import { closeWindow } from "./window-host";

const CLOSE_ACTION = { label: "Close", onClick: closeWindow };

function noticeFor(connections: ConnectionsState) {
  if (connections.kind === "empty") {
    return (
      <DialNotice
        actions={[CLOSE_ACTION]}
        description="Connect Reflet from any app's devtools panel (footer → Connect), then come back here."
        title="No organization yet"
      />
    );
  }
  if (connections.kind === "failed") {
    return (
      <DialNotice
        actions={[CLOSE_ACTION]}
        description={connections.message}
        isFailure
        title="Organizations didn't load"
      />
    );
  }
  return null;
}

function ConnectionDial({
  connections,
  stream,
}: {
  connections: ConnectionsState;
  stream: HubStream;
}) {
  const isLinkLost = stream.link === "lost";
  return (
    <>
      <IdleStateReport epoch={stream.epoch} />
      <WaitingDial
        activity={stream.activity}
        busyLabel={
          connections.kind === "loading" && !isLinkLost
            ? "Connecting to Reflet Live"
            : null
        }
        isLinkLost={isLinkLost}
        notice={noticeFor(connections)}
      />
    </>
  );
}

export function LiveWindow() {
  const stream = useHubStream();
  const { select, state } = useHubConnections(stream.epoch);

  if (stream.link === "elsewhere") {
    return (
      <WaitingDial
        activity={null}
        isLinkLost={false}
        notice={
          <DialNotice
            actions={[CLOSE_ACTION]}
            description="Reflet Live is open in another window."
            title="Already open"
          />
        }
      />
    );
  }
  if (state.kind === "ready") {
    return (
      <LiveRecorder
        activity={stream.activity}
        choice={{
          connections: state.connections,
          onSelect: select,
          selectedId: state.selectedId,
        }}
        commands={stream.commands}
        epoch={stream.epoch}
        isLinkLost={stream.link === "lost"}
        key={state.selectedId}
      />
    );
  }
  return <ConnectionDial connections={state} stream={stream} />;
}
