"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  OctagonXIcon,
  PauseCircleIcon,
} from "lucide-react";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle2Icon,
    bg: "bg-green-500/10 border-green-500/20",
    text: "text-green-700 dark:text-green-400",
    label: "All systems operational",
  },
  degraded: {
    icon: AlertTriangleIcon,
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    label: "System issues detected",
  },
  critical: {
    icon: OctagonXIcon,
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-700 dark:text-red-400",
    label: "System needs attention",
  },
  stopped: {
    icon: PauseCircleIcon,
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    label: "Autopilot paused",
  },
} as const;

export function HealthBanner() {
  const { organizationId } = useAutopilotContext();
  const health = useQuery(api.autopilot.health.getSystemHealth, {
    organizationId,
  });

  if (!health || health.status === "healthy") {
    return null;
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;
  const topIssue = health.issues[0];

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-3 rounded-lg border p-3",
        config.bg
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", config.text)} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-sm", config.text)}>{config.label}</p>
        {topIssue && (
          <p className="mt-0.5 text-muted-foreground text-xs">
            {topIssue.message}
            {topIssue.resolution ? ` — ${topIssue.resolution}` : ""}
          </p>
        )}
        {health.issues.length > 1 && (
          <p className="mt-1 text-muted-foreground/70 text-xs">
            +{health.issues.length - 1} more issue
            {health.issues.length > 2 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
