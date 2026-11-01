import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { RefletMarkIcon } from "../../../feedback/ui/icons";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../../sessions/recorder/session-recorder";
import { RecordingClock } from "../recorder/recording-clock";
import { RecordingLevels } from "../recorder/recording-levels";

export function IdleHub() {
  return (
    <span className="live-dial-mark">
      <RefletMarkIcon size={30} />
    </span>
  );
}

export function BusyHub({ label }: { label: string }) {
  return <Spinner label={label} size="sm" />;
}

export function RecorderHub({
  recorder,
  snapshot,
}: {
  recorder: SessionRecorder;
  snapshot: RecorderSnapshot;
}) {
  switch (snapshot.phase) {
    case "recording":
    case "paused":
      return (
        <>
          <RecordingClock snapshot={snapshot} />
          <RecordingLevels
            className="h-4 w-14"
            isLive={snapshot.phase === "recording"}
            recorder={recorder}
          />
        </>
      );
    case "requesting":
      return <BusyHub label="Waiting for the microphone" />;
    case "finishing":
      return <BusyHub label="Saving the session" />;
    default:
      return <IdleHub />;
  }
}
