import { useState } from "react";
import { devtoolsTransport } from "../../../sessions/api/session-transports";
import {
  SessionWorkspaceProvider,
  useWorkspaceLoader,
} from "../../../sessions/ui/session-workspace";
import { DialNotice } from "../floating-dial/dial/dial-notice";
import {
  type OrganizationChoice,
  OrganizationPage,
} from "../floating-dial/dial-pages";
import { WaitingDial } from "../floating-dial/floating-dial";
import type { CommandChannel, HubActivity } from "../hub-link/use-hub-stream";
import { closeWindow } from "../window-host";
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

function UnreachableWorkspace({
  activity,
  choice,
  isLinkLost,
  message,
  onRetry,
}: {
  activity: HubActivity;
  choice: OrganizationChoice;
  isLinkLost: boolean;
  message: string;
  onRetry: () => void;
}) {
  const [isChoosing, setIsChoosing] = useState(false);
  if (isChoosing) {
    return (
      <WaitingDial activity={activity} isLinkLost={isLinkLost}>
        <OrganizationPage {...choice} onBack={() => setIsChoosing(false)} />
      </WaitingDial>
    );
  }
  const exit =
    choice.connections.length > 1
      ? { label: "Switch organization", onClick: () => setIsChoosing(true) }
      : { label: "Close", onClick: closeWindow };
  return (
    <WaitingDial
      activity={activity}
      isLinkLost={isLinkLost}
      notice={
        <DialNotice
          actions={[{ label: "Try again", onClick: onRetry }, exit]}
          description={message}
          isFailure
        />
      }
    />
  );
}

export function LiveRecorder({
  activity,
  choice,
  commands,
  epoch,
  isLinkLost,
}: {
  activity: HubActivity;
  choice: OrganizationChoice;
  commands: CommandChannel;
  epoch: number;
  isLinkLost: boolean;
}) {
  const [transport] = useState(devtoolsTransport);
  const [isRevoked, setIsRevoked] = useState(false);
  const loaded = useWorkspaceLoader({
    canAddToBoard: false,
    onUnauthorized: () => setIsRevoked(true),
    surface: "live",
    transport,
  });

  if (loaded.kind === "ready") {
    return (
      <SessionWorkspaceProvider workspace={loaded.workspace}>
        <LiveControls
          activity={activity}
          choice={choice}
          commands={commands}
          epoch={epoch}
          isLinkLost={isLinkLost}
          workspace={loaded.workspace}
        />
      </SessionWorkspaceProvider>
    );
  }
  return (
    <>
      <IdleStateReport epoch={epoch} />
      {loaded.kind === "failed" ? (
        <UnreachableWorkspace
          activity={activity}
          choice={choice}
          isLinkLost={isLinkLost}
          message={isRevoked ? REVOKED_MESSAGE : loaded.message}
          onRetry={loaded.retry}
        />
      ) : (
        <WaitingDial
          activity={activity}
          busyLabel="Connecting to Reflet"
          isLinkLost={isLinkLost}
        />
      )}
    </>
  );
}
