import { useState } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetLabels,
} from "../../../feedback/types";
import { SquareIcon, TargetIcon } from "../../../feedback/ui/icons";
import { ElementPicker } from "../../../feedback/ui/picker";
import type { LiveCommand } from "../../../live/protocol";
import { PauseIcon, PlayIcon } from "../../../sessions/ui/session-icons";
import { BarButton } from "../devtools-bar";
import { reportFailure } from "../notices";
import type { LiveLinkControls } from "./use-live-link";

const LIVE_PICKER_LABELS: FeedbackWidgetLabels = {
  ...DEFAULT_WIDGET_LABELS,
  attachElement: "Send to Reflet Live",
  elementNote: "Note for this element (optional)",
  elementNotePlaceholder: "What about it?",
  pickElementHint: "Point at the element you are talking about",
};

const COMMAND_FAILURES: Record<LiveCommand, string> = {
  pause: "Reflet Live did not pause",
  resume: "Reflet Live did not resume",
  start: "Reflet Live did not start recording",
  stop: "Reflet Live did not stop",
};

function LiveDot({
  label,
  tone,
}: {
  label: string;
  tone: "muted" | "paused" | "recording";
}) {
  return (
    <span
      aria-label={label}
      className="dt-live-dot"
      data-tone={tone}
      role="img"
      title={label}
    />
  );
}

export function LiveControls({
  live,
  onPointAt,
}: {
  live: LiveLinkControls;
  onPointAt: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const { status } = live;
  if (status.state === "off") {
    return null;
  }

  const title = status.organizationName
    ? `Reflet Live · ${status.organizationName}`
    : "Reflet Live";
  const run = (action: LiveCommand) => {
    setIsSending(true);
    live
      .command(action)
      .catch((error: unknown) => reportFailure(COMMAND_FAILURES[action], error))
      .finally(() => setIsSending(false));
  };
  const stopButton = (
    <BarButton
      disabled={isSending}
      label="Stop the Reflet Live recording"
      onClick={() => run("stop")}
    >
      <SquareIcon />
    </BarButton>
  );

  return (
    <fieldset aria-label={title} className="dt-live" title={title}>
      {status.state === "no-window" && (
        <LiveDot label="Reflet Live window is closed" tone="muted" />
      )}
      {status.state === "idle" &&
        (status.canStart ? (
          <BarButton
            disabled={isSending}
            label="Record with Reflet Live"
            onClick={() => run("start")}
          >
            <span className="dt-live-dot" data-tone="recording" />
          </BarButton>
        ) : (
          <LiveDot label="Record from the Reflet Live window" tone="muted" />
        ))}
      {status.state === "recording" && (
        <>
          <span className="dt-live-label">
            <LiveDot label="Recording" tone="recording" />
            Live
          </span>
          <BarButton label="Point at an element" onClick={onPointAt}>
            <TargetIcon />
          </BarButton>
          <BarButton
            disabled={isSending}
            label="Pause the Reflet Live recording"
            onClick={() => run("pause")}
          >
            <PauseIcon />
          </BarButton>
          {stopButton}
        </>
      )}
      {status.state === "paused" && (
        <>
          <LiveDot label="Paused" tone="paused" />
          <BarButton
            disabled={isSending}
            label="Resume the Reflet Live recording"
            onClick={() => run("resume")}
          >
            <PlayIcon />
          </BarButton>
          {stopButton}
        </>
      )}
      {status.state === "finishing" && (
        <button className="dt-btn" disabled type="button">
          Saving…
        </button>
      )}
    </fieldset>
  );
}

export function LivePicker({
  onDone,
  select,
}: {
  onDone: () => void;
  select: LiveLinkControls["select"];
}) {
  return (
    <ElementPicker
      labels={LIVE_PICKER_LABELS}
      onCancel={onDone}
      onPick={(element, note) => {
        onDone();
        select(element, note.trim() || null).catch((error: unknown) =>
          reportFailure("The pick did not reach Reflet Live", error)
        );
      }}
    />
  );
}
