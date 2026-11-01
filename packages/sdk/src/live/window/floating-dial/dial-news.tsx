import { Badge } from "@ctrl-ui/react/ui/badge";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Text } from "@ctrl-ui/react/ui/typography";
import { useState } from "react";
import { useNotices } from "../../../devtools/client/notices";
import { TargetIcon } from "../../../feedback/ui/icons";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";
import { describePlace } from "../../protocol";
import type { HubActivity } from "../hub-link/use-hub-stream";
import { placeOfFocus } from "../place-of-focus";
import {
  RecorderStatus,
  recorderStatusText,
} from "../recorder/recorder-status";
import { DialLegend } from "./dial/dial-frame";
import { LiveTranscript, TranscriptToggle } from "./live-transcript";
import { describeCapture, useRecentCapture } from "./recent-capture";

export const LINK_LOST_MESSAGE =
  "Reflet Live stopped in the terminal: run npx reflet-cli live again.";

const SPEAK_HINT = "Passages show here a few seconds after you speak.";
const JOIN_HINT =
  "Open one of your apps with the Reflet devtools: it joins on its own.";
const AGENT_HINT = "No agent following: run /reflet-live in your coding agent.";
const FOLLOWING_HINT = "Your agent is following along.";

function hintFor(activity: HubActivity, isCapturing: boolean): string {
  if (activity.apps.length === 0) {
    return JOIN_HINT;
  }
  if (!activity.agentFollowing) {
    return AGENT_HINT;
  }
  return isCapturing ? SPEAK_HINT : FOLLOWING_HINT;
}

function NewsText({
  isFailure = false,
  text,
}: {
  isFailure?: boolean;
  text: string;
}) {
  return (
    <Text
      className="line-clamp-2"
      role="status"
      size="caption"
      title={text}
      tone={isFailure ? "destructive" : "muted"}
    >
      {text}
    </Text>
  );
}

function HintLine({
  activity,
  isCapturing,
}: {
  activity: HubActivity;
  isCapturing: boolean;
}) {
  return (
    <span className="flex min-w-0 max-w-full items-center gap-1.5">
      {activity.transcribing > 0 && <Spinner label="Transcribing" size="xs" />}
      <Text className="line-clamp-2" size="caption" tone="muted">
        {hintFor(activity, isCapturing)}
      </Text>
    </span>
  );
}

function DialNews({
  activity,
  isLinkLost,
  snapshot,
}: {
  activity: HubActivity;
  isLinkLost: boolean;
  snapshot: RecorderSnapshot | null;
}) {
  const capture = useRecentCapture(activity.lastCapture);
  const status = useNotices()
    .filter((notice) => notice.kind === "status")
    .at(-1);
  if (snapshot && recorderStatusText(snapshot) !== "") {
    return <RecorderStatus className="line-clamp-2" snapshot={snapshot} />;
  }
  if (isLinkLost) {
    return <NewsText isFailure text={LINK_LOST_MESSAGE} />;
  }
  if (status) {
    return <NewsText text={status.message} />;
  }
  if (capture) {
    return (
      <Badge className="max-w-full" color="blue" size="sm">
        {capture.kind === "pick" && <TargetIcon />}
        <span className="truncate">{describeCapture(capture)}</span>
      </Badge>
    );
  }
  if (activity.entries.length > 0) {
    return null;
  }
  const isCapturing =
    snapshot?.phase === "recording" || snapshot?.phase === "paused";
  return <HintLine activity={activity} isCapturing={isCapturing} />;
}

export function LiveLegend({
  activity,
  isLinkLost,
  snapshot = null,
}: {
  activity: HubActivity;
  isLinkLost: boolean;
  snapshot?: RecorderSnapshot | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasPassages = activity.entries.length > 0;
  const place =
    activity.apps.length === 0
      ? "No app joined yet"
      : describePlace(placeOfFocus(activity));
  return (
    <DialLegend
      action={
        hasPassages && (
          <TranscriptToggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded((current) => !current)}
          />
        )
      }
      isExpanded={hasPassages && isExpanded}
      title={place}
    >
      <DialNews
        activity={activity}
        isLinkLost={isLinkLost}
        snapshot={snapshot}
      />
      <LiveTranscript
        entries={activity.entries}
        isExpanded={isExpanded}
        isTranscribing={activity.transcribing > 0}
        onExpand={() => setIsExpanded(true)}
      />
    </DialLegend>
  );
}
