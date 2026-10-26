import { Button, type ButtonProps } from "@ctrl-ui/react/ui/button";
import type { ReactNode } from "react";
import { SquareIcon } from "../../../feedback/ui/icons";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";
import {
  MicIcon,
  PauseIcon,
  PlayIcon,
} from "../../../sessions/ui/session-icons";
import type { LiveCommand } from "../../protocol";

export interface RecorderActions {
  onCommand: (action: LiveCommand) => void;
  onRecord: () => void;
}

function ControlButton({
  icon,
  iconOnly,
  label,
  ...props
}: Omit<ButtonProps, "children"> & {
  icon: ReactNode;
  iconOnly: boolean;
  label: string;
}) {
  return (
    <Button
      aria-label={iconOnly ? label : undefined}
      iconOnly={iconOnly}
      title={iconOnly ? label : undefined}
      variant="surface"
      {...props}
    >
      {icon}
      {iconOnly ? null : label}
    </Button>
  );
}

export function ControlButtons({
  isCompact,
  onCommand,
  onRecord,
  snapshot,
}: RecorderActions & { isCompact: boolean; snapshot: RecorderSnapshot }) {
  const { pauseReason, phase } = snapshot;
  const size = isCompact ? "sm" : "md";
  if (phase === "idle" || phase === "failed" || phase === "requesting") {
    return (
      <Button
        disabled={phase === "requesting"}
        onClick={onRecord}
        size={size}
        tone="primary"
        variant="solid"
      >
        <MicIcon />
        Record
      </Button>
    );
  }
  return (
    <>
      {phase === "recording" && (
        <ControlButton
          icon={<PauseIcon />}
          iconOnly={isCompact}
          label="Pause"
          onClick={() => onCommand("pause")}
          size={size}
        />
      )}
      {phase === "paused" && pauseReason !== "limit" && (
        <ControlButton
          icon={<PlayIcon />}
          iconOnly={isCompact}
          label="Resume"
          onClick={() => onCommand("resume")}
          size={size}
          tone="primary"
        />
      )}
      <ControlButton
        disabled={phase === "finishing"}
        icon={<SquareIcon />}
        iconOnly={isCompact}
        label={phase === "finishing" ? "Saving…" : "Stop"}
        onClick={() => onCommand("stop")}
        size={size}
      />
    </>
  );
}
