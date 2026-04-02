"use client";

import { Clock } from "@phosphor-icons/react";
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
  const [remaining, setRemaining] = useState(scheduledAt - Date.now());

  useEffect(
    function tickCountdownInterval() {
      const interval = setInterval(() => {
        setRemaining(scheduledAt - Date.now());
      }, 1000);

      return () => clearInterval(interval);
    },
    [scheduledAt]
  );

  if (remaining <= 0) {
    return (
      <span
        className={cn(
          "flex items-center gap-1 text-amber-600 text-xs dark:text-amber-400",
          className
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        Publishing...
      </span>
    );
  }

  const FIVE_MINUTES = 5 * 60 * 1000;
  const isUrgent = remaining < FIVE_MINUTES;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs",
        isUrgent
          ? "animate-pulse text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
        className
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      Publishing in {formatCountdown(remaining)}
    </span>
  );
}
