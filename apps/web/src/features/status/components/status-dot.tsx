import { cn } from "@/lib/utils";
import type { MonitorStatus, OverallStatus } from "../lib/status-meta";

interface StatusDotProps {
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  status: MonitorStatus | OverallStatus;
}

const colorMap: Record<StatusDotProps["status"], string> = {
  degraded: "bg-warning",
  major_outage: "bg-destructive",
  no_monitors: "bg-muted-foreground/40",
  operational: "bg-success",
  paused: "bg-muted-foreground",
};

const sizeMap = {
  lg: "size-3",
  md: "size-2.5",
  sm: "size-2",
};

export function StatusDot({
  status,
  size = "md",
  pulse = false,
}: StatusDotProps) {
  const showPulse =
    pulse && (status === "degraded" || status === "major_outage");

  return (
    <span aria-hidden className="relative inline-flex shrink-0">
      <span className={cn("rounded-full", colorMap[status], sizeMap[size])} />
      {showPulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping",
            colorMap[status]
          )}
        />
      )}
    </span>
  );
}
