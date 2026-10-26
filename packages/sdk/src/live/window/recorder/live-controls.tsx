import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Text } from "@ctrl-ui/react/ui/typography";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useSyncStatus } from "../../../sessions/local/local-sessions";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../../sessions/recorder/session-recorder";
import { useRecorderSnapshot } from "../../../sessions/recorder/use-recorder-snapshot";
import type { SessionWorkspace } from "../../../sessions/ui/session-workspace";
import type { LiveCommand } from "../../protocol";
import { FloatingBar } from "../floating-bar/floating-bar";
import { useFloatingWindow } from "../floating-bar/use-floating-window";
import type { CommandChannel, HubActivity } from "../hub-link/use-hub-stream";
import { ControlButtons, type RecorderActions } from "./control-buttons";
import { runLiveCommand, useLiveCommands } from "./live-commands";
import { RecorderStatus } from "./recorder-status";
import { RecordingClock } from "./recording-clock";
import { RecordingLevels } from "./recording-levels";
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

function RecorderPanel({
  canFloat,
  onFloat,
  recorder,
  snapshot,
  ...actions
}: RecorderActions & {
  canFloat: boolean;
  onFloat: () => void;
  recorder: SessionRecorder;
  snapshot: RecorderSnapshot;
}) {
  const isCapturing =
    snapshot.phase === "recording" || snapshot.phase === "paused";
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isCapturing && <RecordingClock snapshot={snapshot} />}
          {isCapturing && (
            <RecordingLevels
              className="h-6 w-24"
              isLive={snapshot.phase === "recording"}
              recorder={recorder}
            />
          )}
          <span
            className={cn("flex items-center gap-2", isCapturing && "ms-auto")}
          >
            <ControlButtons
              {...actions}
              isCompact={false}
              snapshot={snapshot}
            />
            {canFloat && (
              <Button onClick={onFloat} size="md" variant="ghost">
                Floating bar
              </Button>
            )}
          </span>
        </div>
        <RecorderStatus snapshot={snapshot} />
      </CardContent>
    </Card>
  );
}

function InFloatingBar({ onBringBack }: { onBringBack: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <Text tone="muted">
          The recording controls are in the floating bar.
        </Text>
        <Button onClick={onBringBack} variant="surface">
          Bring them back
        </Button>
      </CardContent>
    </Card>
  );
}

export function LiveControls({
  activity,
  commands,
  epoch,
  workspace,
}: {
  activity: HubActivity;
  commands: CommandChannel;
  epoch: number;
  workspace: SessionWorkspace;
}) {
  const { account, identity, recorder } = workspace;
  const snapshot = useRecorderSnapshot(recorder);
  const { pendingOperations } = useSyncStatus(account.key);
  const canStart = useUserActivation();
  const floating = useFloatingWindow();

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

  const actions: RecorderActions = {
    onCommand: (action: LiveCommand) => runLiveCommand(recorder, action),
    onRecord: () => {
      runLiveCommand(recorder, "start");
      if (!floating.window) {
        floating.open();
      }
    },
  };

  if (floating.window) {
    return (
      <>
        {createPortal(
          <FloatingBar
            {...actions}
            activity={activity}
            recorder={recorder}
            snapshot={snapshot}
          />,
          floating.window.document.body
        )}
        <InFloatingBar onBringBack={floating.close} />
      </>
    );
  }
  return (
    <RecorderPanel
      {...actions}
      canFloat={floating.isSupported}
      onFloat={floating.open}
      recorder={recorder}
      snapshot={snapshot}
    />
  );
}
