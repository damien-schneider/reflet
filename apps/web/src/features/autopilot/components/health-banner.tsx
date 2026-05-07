"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  InboxIcon,
  OctagonXIcon,
  PauseCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

function getSeverityDot(severity: string) {
  if (severity === "critical") {
    return SEVERITY_DOT.critical;
  }
  if (severity === "warning") {
    return SEVERITY_DOT.warning;
  }
  return SEVERITY_DOT.info;
}

export function HealthBanner() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const health = useQuery(api.autopilot.health.getSystemHealth, {
    organizationId,
  });
  const [expanded, setExpanded] = useState(false);

  if (!health) {
    return null;
  }

  const baseUrl = `/dashboard/${orgSlug}/autopilot`;
  const pendingApprovalCount = health.pendingApprovalCount ?? 0;

  // When healthy: show pending approvals if any, otherwise hide
  if (health.status === "healthy") {
    if (pendingApprovalCount > 0) {
      return (
        <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <InboxIcon className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-blue-700 text-sm dark:text-blue-300">
                  {pendingApprovalCount} item
                  {pendingApprovalCount > 1 ? "s" : ""} waiting for your
                  approval
                </p>
                <p className="text-blue-600/80 text-xs dark:text-blue-400/70">
                  Agents are blocked until you review — approve or reject to
                  keep the pipeline flowing
                </p>
              </div>
            </div>
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 gap-1.5 border-blue-500/30 text-blue-700 text-xs hover:bg-blue-500/10 dark:text-blue-300"
              )}
              href={`${baseUrl}/inbox`}
            >
              <Badge className="bg-blue-500 text-white" variant="default">
                {pendingApprovalCount}
              </Badge>
              Review Inbox
              <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        </div>
      );
    }
    return null;
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;
  const isCritical = health.status === "critical";
  const hasMultipleIssues = health.issues.length > 1;

  // Show all issues when critical, first only when degraded (unless expanded)
  const visibleIssues =
    isCritical || expanded ? health.issues : health.issues.slice(0, 1);

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
              <Button
                className="h-auto gap-1 px-1 py-0 text-muted-foreground text-xs hover:text-foreground"
                onClick={() => setExpanded((prev) => !prev)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {expanded ? "Show less" : `${health.issues.length} issues`}
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </Button>
            )}
          </div>

          <div className="mt-2 space-y-3">
            {visibleIssues.map((issue) => {
              const actionUrl =
                "actionUrl" in issue ? issue.actionUrl : undefined;
              const actionLabel =
                "actionLabel" in issue ? issue.actionLabel : undefined;

              return (
                <div className="flex items-start gap-2.5" key={issue.id}>
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      getSeverityDot(issue.severity)
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
                  {actionUrl && actionLabel && (
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "shrink-0 gap-1 text-xs"
                      )}
                      href={`${baseUrl}/${actionUrl}`}
                    >
                      {actionLabel}
                      <ArrowRightIcon className="size-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
