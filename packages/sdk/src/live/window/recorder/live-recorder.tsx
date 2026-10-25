import { useState } from "react";
import { devtoolsTransport } from "../../../sessions/api/session-transports";
import { useRecorderSnapshot } from "../../../sessions/recorder/use-recorder-snapshot";
import {
  type SessionWorkspace,
  SessionWorkspaceProvider,
  useWorkspaceLoader,
} from "../../../sessions/ui/session-workspace";
import type { LiveConnection } from "../hub-link/use-hub-connections";
import type { CommandChannel } from "../hub-link/use-hub-stream";
import { LiveControls } from "./live-controls";
import { useWindowStateReport } from "./use-window-state-report";

const REVOKED_MESSAGE =
  "This connection was revoked. Reconnect from that app's devtools panel.";

export function IdleStateReport({ epoch }: { epoch: number }) {
  useWindowStateReport(
    {
      canStart: false,
      limits: null,
      pauseReason: null,
      pendingUploads: 0,
      phase: "idle",
      sessionId: null,
      startedAt: null,
    },
    epoch
  );
  return null;
}

interface OrganizationChoice {
  connections: LiveConnection[];
  onSelect: (id: string) => void;
  selectedId: string;
}

function OrganizationPicker({
  connections,
  isLocked,
  onSelect,
  selectedId,
}: OrganizationChoice & { isLocked: boolean }) {
  if (connections.length < 2) {
    const name = connections[0]?.organizationName ?? "";
    return <p className="dt-meta">org: {name}</p>;
  }
  return (
    <label className="lw-org">
      <span className="dt-meta">Organization</span>
      <select
        className="dt-field"
        disabled={isLocked}
        onChange={(event) => onSelect(event.target.value)}
        title={
          isLocked ? "Stop the recording to switch organization" : undefined
        }
        value={selectedId}
      >
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.organizationName}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadyRecorder({
  commands,
  epoch,
  picker,
  workspace,
}: {
  commands: CommandChannel;
  epoch: number;
  picker: OrganizationChoice;
  workspace: SessionWorkspace;
}) {
  const { phase } = useRecorderSnapshot(workspace.recorder);
  return (
    <SessionWorkspaceProvider workspace={workspace}>
      <OrganizationPicker
        {...picker}
        isLocked={phase !== "idle" && phase !== "failed"}
      />
      <LiveControls commands={commands} epoch={epoch} workspace={workspace} />
    </SessionWorkspaceProvider>
  );
}

export function LiveRecorder({
  commands,
  connections,
  epoch,
  onSelect,
  selectedId,
}: {
  commands: CommandChannel;
  connections: LiveConnection[];
  epoch: number;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const [transport] = useState(devtoolsTransport);
  const [isRevoked, setIsRevoked] = useState(false);
  const loaded = useWorkspaceLoader({
    onUnauthorized: () => setIsRevoked(true),
    surface: "live",
    transport,
  });
  const picker = { connections, onSelect, selectedId };

  if (loaded.kind === "ready") {
    return (
      <ReadyRecorder
        commands={commands}
        epoch={epoch}
        picker={picker}
        workspace={loaded.workspace}
      />
    );
  }
  return (
    <>
      <IdleStateReport epoch={epoch} />
      <OrganizationPicker {...picker} isLocked={false} />
      {loaded.kind === "failed" && (
        <div className="lw-section">
          <p className="dt-error">
            {isRevoked ? REVOKED_MESSAGE : loaded.message}
          </p>
          <button className="dt-btn" onClick={loaded.retry} type="button">
            Try again
          </button>
        </div>
      )}
      {(loaded.kind === "loading" || loaded.kind === "idle") && (
        <p className="dt-meta">Connecting to Reflet…</p>
      )}
    </>
  );
}
