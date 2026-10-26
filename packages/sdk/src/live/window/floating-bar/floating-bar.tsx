import { Badge } from "@ctrl-ui/react/ui/badge";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Text } from "@ctrl-ui/react/ui/typography";
import { TargetIcon } from "../../../feedback/ui/icons";
import type {
  RecorderSnapshot,
  SessionRecorder,
} from "../../../sessions/recorder/session-recorder";
import { describePlace } from "../../protocol";
import type { HubActivity } from "../hub-link/use-hub-stream";
import { placeOfFocus } from "../place-of-focus";
import {
  ControlButtons,
  type RecorderActions,
} from "../recorder/control-buttons";
import {
  RecorderStatus,
  recorderStatusText,
} from "../recorder/recorder-status";
import { RecordingClock } from "../recorder/recording-clock";
import { RecordingLevels } from "../recorder/recording-levels";
import { describeCapture, useRecentCapture } from "./recent-capture";

const SPEAK_HINT = "Passages show here a few seconds after you speak.";

function PassageLine({
  activity,
  isCapturing,
}: {
  activity: HubActivity;
  isCapturing: boolean;
}) {
  const passage = activity.entries.at(-1)?.lines[0];
  const text = passage ?? (isCapturing ? SPEAK_HINT : "");
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      {activity.transcribing > 0 && <Spinner label="Transcribing" size="xs" />}
      <Text className="truncate" size="caption" title={passage} tone="muted">
        {text}
      </Text>
    </span>
  );
}

export function FloatingBar({
  activity,
  recorder,
  snapshot,
  ...actions
}: RecorderActions & {
  activity: HubActivity;
  recorder: SessionRecorder;
  snapshot: RecorderSnapshot;
}) {
  const place = describePlace(placeOfFocus(activity));
  const capture = useRecentCapture(activity.lastCapture);
  const isCapturing =
    snapshot.phase === "recording" || snapshot.phase === "paused";
  return (
    <section
      aria-label="Reflet Live recording"
      className="flex h-dvh flex-col justify-center gap-1 bg-background px-3 text-foreground"
    >
      <div className="flex min-w-0 items-center gap-3">
        {isCapturing && <RecordingClock snapshot={snapshot} />}
        {isCapturing && (
          <RecordingLevels
            className="h-5 w-20"
            isLive={snapshot.phase === "recording"}
            recorder={recorder}
          />
        )}
        <Text className="min-w-0 flex-1 truncate" size="label" title={place}>
          {place}
        </Text>
        <span className="flex shrink-0 gap-1">
          <ControlButtons {...actions} isCompact snapshot={snapshot} />
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <RecorderStatus className="truncate" snapshot={snapshot} />
        {recorderStatusText(snapshot) === "" && (
          <PassageLine activity={activity} isCapturing={isCapturing} />
        )}
        {capture && (
          <Badge className="max-w-1/2 shrink-0" color="blue" size="sm">
            {capture.kind === "pick" && <TargetIcon />}
            <span className="truncate">{describeCapture(capture)}</span>
          </Badge>
        )}
      </div>
    </section>
  );
}
