import { useEffect } from "react";
import { SquareIcon } from "../../../feedback/ui/icons";
import { useSyncStatus } from "../../../sessions/local/local-sessions";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";
import { useRecorderSnapshot } from "../../../sessions/recorder/use-recorder-snapshot";
import { LevelMeter } from "../../../sessions/ui/recording/level-meter";
import { formatClock } from "../../../sessions/ui/session-format";
import {
  MicIcon,
  PauseIcon,
  PlayIcon,
} from "../../../sessions/ui/session-icons";
import type { SessionWorkspace } from "../../../sessions/ui/session-workspace";
import type { LiveCommand } from "../../protocol";
import type { CommandChannel } from "../hub-link/use-hub-stream";
import { runLiveCommand, useLiveCommands } from "./live-commands";
import {
  useUserActivation,
  useWindowStateReport,
} from "./use-window-state-report";

function statusText(snapshot: RecorderSnapshot): string {
  if (snapshot.failure) {
    return snapshot.failure.message;
  }
  if (snapshot.phase === "failed") {
    return "Recording stopped.";
  }
  if (snapshot.phase === "requesting") {
    return "Waiting for the microphone…";
  }
  if (snapshot.pauseReason === "limit") {
    return "Time limit reached: press Stop.";
  }
  if (snapshot.phase === "paused") {
    return "Paused";
  }
  return "";
}

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

function ControlButtons({
  onCommand,
  snapshot,
}: {
  onCommand: (action: LiveCommand) => void;
  snapshot: RecorderSnapshot;
}) {
  const { pauseReason, phase } = snapshot;
  if (phase === "idle" || phase === "failed" || phase === "requesting") {
    return (
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={phase === "requesting"}
        onClick={() => onCommand("start")}
        type="button"
      >
        <MicIcon />
        Record
      </button>
    );
  }
  return (
    <>
      {phase === "recording" && (
        <button
          className="dt-btn"
          onClick={() => onCommand("pause")}
          type="button"
        >
          <PauseIcon />
          Pause
        </button>
      )}
      {phase === "paused" && pauseReason !== "limit" && (
        <button
          className="dt-btn"
          onClick={() => onCommand("resume")}
          type="button"
        >
          <PlayIcon />
          Resume
        </button>
      )}
      <button
        className="dt-btn"
        disabled={phase === "finishing"}
        onClick={() => onCommand("stop")}
        type="button"
      >
        <SquareIcon />
        {phase === "finishing" ? "Saving…" : "Stop"}
      </button>
    </>
  );
}

export function LiveControls({
  commands,
  epoch,
  workspace,
}: {
  commands: CommandChannel;
  epoch: number;
  workspace: SessionWorkspace;
}) {
  const { account, identity, recorder } = workspace;
  const snapshot = useRecorderSnapshot(recorder);
  const { pendingOperations } = useSyncStatus(account.key);
  const canStart = useUserActivation();
  const capturing =
    snapshot.phase === "recording" || snapshot.phase === "paused";

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
  useConfirmLeaving(capturing);

  return (
    <section className="lw-section">
      <div
        aria-label="Reflet Live recording"
        className="dt-rec lw-controls"
        data-phase={snapshot.phase}
        role="toolbar"
      >
        {capturing && <span aria-hidden="true" className="dt-rec-dot" />}
        {capturing && <LevelMeter recorder={recorder} />}
        <span aria-live="off" className="dt-rec-time" role="timer">
          {formatClock(snapshot.activeMs)}
        </span>
        <ControlButtons
          onCommand={(action) => runLiveCommand(recorder, action)}
          snapshot={snapshot}
        />
      </div>
      <p aria-live="polite" className="dt-rec-status">
        {statusText(snapshot)}
      </p>
    </section>
  );
}
