"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  OctagonXIcon,
  PauseCircleIcon,
} from "lucide-react";
import { useState } from "react";

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
  const [expanded, setExpanded] = useState(false);

  if (!health || health.status === "healthy") {
    return null;
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;
  const hasMultipleIssues = health.issues.length > 1;
  const visibleIssues = expanded ? health.issues : health.issues.slice(0, 1);

  return (
    <div className={cn("mb-4 rounded-lg border p-3", config.bg)}>
      <button
        className="flex w-full items-start gap-3 text-left"
        disabled={!hasMultipleIssues}
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <Icon className={cn("mt-0.5 size-4 shrink-0", config.text)} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-sm", config.text)}>
            {config.label}
            {hasMultipleIssues && (
              <span className="ml-1 text-muted-foreground/70 text-xs">
                ({health.issues.length} issues)
              </span>
            )}
          </p>
        </div>
        {hasMultipleIssues && (
          <ChevronDownIcon
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>
      <div className="mt-2 space-y-1.5 pl-7">
        {visibleIssues.map((issue) => (
          <div className="text-muted-foreground text-xs" key={issue.message}>
            <span>{issue.message}</span>
            {issue.resolution && (
              <span className="ml-1 text-muted-foreground/60">
                — {issue.resolution}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
