import { useEffect } from "react";
import { announce, reportFailure } from "../../../devtools/client/notices";
import type { SessionRecorder } from "../../../sessions/recorder/session-recorder";
import type { LiveCommand } from "../../protocol";
import type { CommandChannel } from "../hub-link/use-hub-stream";
import { hasUserActivation } from "./use-window-state-report";

const FAILURE_LABELS: Record<LiveCommand, string> = {
  pause: "The recording did not pause",
  resume: "The recording did not resume",
  start: "The recording did not start",
  stop: "The recording did not stop",
};

export const NEEDS_ACTIVATION_MESSAGE =
  "Press Record in this window once: the browser only gives it the microphone after a click here.";

async function apply(
  recorder: SessionRecorder,
  action: LiveCommand
): Promise<void> {
  const { pauseReason, phase } = recorder.getSnapshot();
  switch (action) {
    case "start":
      if (phase !== "idle" && phase !== "failed") {
        return;
      }
      if (!hasUserActivation()) {
        announce(NEEDS_ACTIVATION_MESSAGE);
        return;
      }
      await recorder.start({ detectSpeakers: false });
      return;
    case "pause":
      if (phase === "recording") {
        recorder.pause("paused");
      }
      return;
    case "resume":
      if (phase === "paused" && pauseReason !== "limit") {
        await recorder.resume();
      }
      return;
    case "stop":
      if (phase === "recording" || phase === "paused") {
        await recorder.finish();
      }
      return;
    default:
      return;
  }
}

export async function runLiveCommand(
  recorder: SessionRecorder,
  action: LiveCommand
): Promise<void> {
  try {
    await apply(recorder, action);
  } catch (error) {
    reportFailure(FAILURE_LABELS[action], error);
  }
}

export function useLiveCommands(
  recorder: SessionRecorder,
  commands: CommandChannel
): void {
  useEffect(
    () =>
      commands.subscribe((action) => {
        runLiveCommand(recorder, action);
      }),
    [commands, recorder]
  );
}
