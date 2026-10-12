import { useSyncExternalStore } from "react";
import type { RecorderSnapshot, SessionRecorder } from "./session-recorder";

export function useRecorderSnapshot(
  recorder: SessionRecorder
): RecorderSnapshot {
  return useSyncExternalStore(
    recorder.subscribe,
    recorder.getSnapshot,
    recorder.getSnapshot
  );
}
