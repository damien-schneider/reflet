import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Text } from "@ctrl-ui/react/ui/typography";
import { useState } from "react";
import { devtoolsTransport } from "../../../sessions/api/session-transports";
import { useRecorderSnapshot } from "../../../sessions/recorder/use-recorder-snapshot";
import {
  type SessionWorkspace,
  SessionWorkspaceProvider,
  useWorkspaceLoader,
} from "../../../sessions/ui/session-workspace";
import type { LiveConnection } from "../hub-link/use-hub-connections";
import type { CommandChannel, HubActivity } from "../hub-link/use-hub-stream";
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
    return (
      <Text size="caption" tone="muted">
        Records into {connections[0]?.organizationName}
      </Text>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Text id="live-organization" size="caption" tone="muted">
        Records into
      </Text>
      <Select
        disabled={isLocked}
        items={connections.map((connection) => ({
          label: connection.organizationName,
          value: connection.id,
        }))}
        onValueChange={(id) => {
          if (id) {
            onSelect(id);
          }
        }}
        value={selectedId}
      >
        <SelectTrigger
          aria-labelledby="live-organization"
          size="sm"
          title={
            isLocked ? "Stop the recording to switch organization" : undefined
          }
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.organizationName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

function ReadyRecorder({
  activity,
  commands,
  epoch,
  picker,
  workspace,
}: {
  activity: HubActivity;
  commands: CommandChannel;
  epoch: number;
  picker: OrganizationChoice;
  workspace: SessionWorkspace;
}) {
  const { phase } = useRecorderSnapshot(workspace.recorder);
  return (
    <SessionWorkspaceProvider workspace={workspace}>
      <div className="flex flex-col gap-2">
        <OrganizationPicker
          {...picker}
          isLocked={phase !== "idle" && phase !== "failed"}
        />
        <LiveControls
          activity={activity}
          commands={commands}
          epoch={epoch}
          workspace={workspace}
        />
      </div>
    </SessionWorkspaceProvider>
  );
}

export function LiveRecorder({
  activity,
  commands,
  connections,
  epoch,
  onSelect,
  selectedId,
}: {
  activity: HubActivity;
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
        activity={activity}
        commands={commands}
        epoch={epoch}
        picker={picker}
        workspace={loaded.workspace}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <OrganizationPicker {...picker} isLocked={false} />
      <IdleStateReport epoch={epoch} />
      {loaded.kind === "failed" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text tone="destructive">
            {isRevoked ? REVOKED_MESSAGE : loaded.message}
          </Text>
          <Button onClick={loaded.retry} size="sm" variant="surface">
            Try again
          </Button>
        </div>
      ) : (
        <span className="flex items-center gap-2">
          <Spinner aria-hidden="true" size="xs" />
          <Text tone="muted">Connecting to Reflet…</Text>
        </span>
      )}
    </div>
  );
}
