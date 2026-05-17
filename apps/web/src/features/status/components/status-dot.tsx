"use client";

import {
  MONITOR_STATUS_DOT_COLORS,
  type MonitorStatus,
} from "@reflet/ui/status-colors";
import { cn } from "@/lib/utils";

interface StatusDotProps {
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  status: MonitorStatus;
}

const sizeMap = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
};

export function StatusDot({
  status,
  size = "md",
  pulse = false,
}: StatusDotProps) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "inline-block rounded-full",
          MONITOR_STATUS_DOT_COLORS[status],
          sizeMap[size]
        )}
      />
      {pulse && status !== "operational" && status !== "paused" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            MONITOR_STATUS_DOT_COLORS[status]
          )}
        />
      )}
    </span>
  );
}
