import { cn } from "@ctrl-ui/react/lib/cn";
import { Text } from "@ctrl-ui/react/ui/typography";
import type { RecorderSnapshot } from "../../../sessions/recorder/session-recorder";

export function recorderStatusText(snapshot: RecorderSnapshot): string {
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
  return "";
}

export function RecorderStatus({
  className,
  snapshot,
}: {
  className?: string;
  snapshot: RecorderSnapshot;
}) {
  const isFailure = snapshot.failure !== null || snapshot.phase === "failed";
  return (
    <Text
      className={cn("empty:hidden", className)}
      role="status"
      size="caption"
      tone={isFailure ? "destructive" : "muted"}
    >
      {recorderStatusText(snapshot)}
    </Text>
  );
}
