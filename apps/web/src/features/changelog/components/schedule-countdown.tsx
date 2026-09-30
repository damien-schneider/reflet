"use client";

import { Clock } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScheduleCountdownProps {
  className?: string;
  scheduledAt: number;
}

function formatCountdown(diffMs: number): string {
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function ScheduleCountdown({
  scheduledAt,
  className,
}: ScheduleCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const remaining = scheduledAt - now;

  const scheduledLabel = format(scheduledAt, "MMM d, yyyy 'at' h:mm a");

  if (remaining <= 0) {
    return (
      <span
        className={cn(
          "flex items-center gap-1 text-warning-text text-xs",
          className
        )}
        title={scheduledLabel}
      >
        <Clock aria-hidden="true" className="size-3.5" />
        Publishing…
      </span>
    );
  }

  const FIVE_MINUTES = 5 * 60 * 1000;
  const isUrgent = remaining < FIVE_MINUTES;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs tabular-nums",
        isUrgent ? "text-warning-text" : "text-muted-foreground",
        className
      )}
      title={scheduledLabel}
    >
      <Clock aria-hidden="true" className="size-3.5" />
      Publishing in {formatCountdown(remaining)}
    </span>
  );
}
