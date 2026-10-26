import { Text } from "@ctrl-ui/react/ui/typography";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";
import { formatClock } from "../../../sessions/ui/session-format";

export function RecordingClock({ snapshot }: { snapshot: RecorderSnapshot }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-muted-foreground/40 data-[phase=recording]:animate-pulse data-[phase=paused]:bg-warning data-[phase=recording]:bg-destructive motion-reduce:animate-none"
        data-phase={snapshot.phase}
      />
      <Text aria-live="off" numeric role="timer" size="label" weight="medium">
        {formatClock(snapshot.activeMs)}
      </Text>
    </span>
  );
}
