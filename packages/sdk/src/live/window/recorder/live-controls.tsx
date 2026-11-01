import { useEffect } from "react";
import { useSyncStatus } from "../../../sessions/local/local-sessions";
import { useRecorderSnapshot } from "../../../sessions/recorder/use-recorder-snapshot";
import type { SessionWorkspace } from "../../../sessions/ui/session-workspace";
import type { OrganizationChoice } from "../floating-dial/dial-pages";
import { RecorderDial } from "../floating-dial/floating-dial";
import type { CommandChannel, HubActivity } from "../hub-link/use-hub-stream";
import { runLiveCommand, useLiveCommands } from "./live-commands";
import {
  useUserActivation,
  useWindowStateReport,
} from "./use-window-state-report";

function useConfirmLeaving(isRecording: boolean): void {
  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const confirmLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", confirmLeaving);
    return () => window.removeEventListener("beforeunload", confirmLeaving);
  }, [isRecording]);
}

export function LiveControls({
  activity,
  choice,
  commands,
  epoch,
  isLinkLost,
  workspace,
}: {
  activity: HubActivity;
  choice: OrganizationChoice;
  commands: CommandChannel;
  epoch: number;
  isLinkLost: boolean;
  workspace: SessionWorkspace;
}) {
  const { account, identity, recorder } = workspace;
  const snapshot = useRecorderSnapshot(recorder);
  const { pendingOperations } = useSyncStatus(account.key);
  const canStart = useUserActivation();

  useWindowStateReport(
    {
      canStart,
      limits: identity.liveLimits,
      pauseReason: snapshot.pauseReason,
      pendingUploads: pendingOperations,
      phase: snapshot.phase,
      sessionId: snapshot.sessionId,
      startedAt: snapshot.startedAt,
    },
    epoch
  );
  useLiveCommands(recorder, commands);
  useConfirmLeaving(
    snapshot.phase === "recording" || snapshot.phase === "paused"
  );

  return (
    <RecorderDial
      activity={activity}
      choice={choice}
      isLinkLost={isLinkLost}
      onCommand={(action) => runLiveCommand(recorder, action)}
      onRecord={() => runLiveCommand(recorder, "start")}
      recorder={recorder}
      snapshot={snapshot}
    />
  );
}
