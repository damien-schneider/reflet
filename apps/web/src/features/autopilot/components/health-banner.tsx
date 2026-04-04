"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  OctagonXIcon,
  PauseCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
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
    label: "Action required",
  },
  stopped: {
    icon: PauseCircleIcon,
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    label: "Autopilot paused",
  },
} as const;

const SEVERITY_DOT = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
} as const;

export function HealthBanner() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const health = useQuery(api.autopilot.health.getSystemHealth, {
    organizationId,
  });
  const [expanded, setExpanded] = useState(false);

  if (!health || health.status === "healthy") {
    return null;
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;
  const isCritical = health.status === "critical";
  const hasMultipleIssues = health.issues.length > 1;

  // Show all issues when critical, first only when degraded (unless expanded)
  const visibleIssues =
    isCritical || expanded ? health.issues : health.issues.slice(0, 1);

  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  return (
    <div className={cn("mb-4 rounded-lg border p-4", config.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", config.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={cn("font-semibold text-sm", config.text)}>
              {config.label}
            </p>
            {hasMultipleIssues && !isCritical && (
              <button
                className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                onClick={() => setExpanded((prev) => !prev)}
                type="button"
              >
                {expanded ? "Show less" : `${health.issues.length} issues`}
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </button>
            )}
          </div>

          <div className="mt-2 space-y-3">
            {visibleIssues.map(
              (issue: {
                id: string;
                severity: string;
                message: string;
                resolution?: string;
                actionUrl?: string;
                actionLabel?: string;
              }) => (
                <div className="flex items-start gap-2.5" key={issue.id}>
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      SEVERITY_DOT[
                        issue.severity as keyof typeof SEVERITY_DOT
                      ] ?? SEVERITY_DOT.info
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm">{issue.message}</p>
                    {issue.resolution && (
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {issue.resolution}
                      </p>
                    )}
                  </div>
                  {issue.actionUrl !== undefined && issue.actionLabel && (
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "shrink-0 gap-1 text-xs"
                      )}
                      href={`${baseUrl}/${issue.actionUrl}`}
                    >
                      {issue.actionLabel}
                      <ArrowRightIcon className="size-3" />
                    </Link>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
