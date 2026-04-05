"use client";

import {
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconLoader2,
  IconPlayerPause,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { AgentIdentity } from "@/features/autopilot/components/agent-identity";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<
  string,
  { icon: ComponentType<{ className?: string }>; color: string }
> = {
  pending: { icon: IconCircleDashed, color: "text-muted-foreground" },
  in_progress: { icon: IconLoader2, color: "text-blue-500" },
  blocked: { icon: IconPlayerPause, color: "text-yellow-500" },
  waiting_review: { icon: IconCircleDashed, color: "text-purple-500" },
  completed: { icon: IconCircleCheck, color: "text-green-500" },
  failed: { icon: IconCircleX, color: "text-red-500" },
  cancelled: { icon: IconCircleX, color: "text-muted-foreground" },
  // Initiative statuses
  discovery: { icon: IconCircleDashed, color: "text-blue-500" },
  definition: { icon: IconCircleDashed, color: "text-purple-500" },
  active: { icon: IconLoader2, color: "text-green-500" },
  paused: { icon: IconPlayerPause, color: "text-muted-foreground" },
  // Story statuses
  draft: { icon: IconCircleDashed, color: "text-muted-foreground" },
  ready: { icon: IconCircleDashed, color: "text-blue-500" },
  in_spec: { icon: IconCircleDashed, color: "text-purple-500" },
  in_dev: { icon: IconLoader2, color: "text-amber-500" },
  in_review: { icon: IconCircleDashed, color: "text-cyan-500" },
  shipped: { icon: IconCircleCheck, color: "text-green-500" },
} as const;

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-muted-foreground",
} as const;

export function IssueRow({
  title,
  status,
  priority,
  assignedAgent,
  updatedAt,
  completionPercent,
  onClick,
  className,
}: {
  title: string;
  status: string;
  priority?: string;
  assignedAgent?: string;
  updatedAt?: number;
  completionPercent?: number;
  onClick?: () => void;
  className?: string;
}) {
  const statusConfig = STATUS_ICONS[status] ?? STATUS_ICONS.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <button
      className={cn(
        "group flex w-full items-center gap-3 border-border border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/40",
        !onClick && "cursor-default",
        className
      )}
      onClick={onClick}
      type="button"
    >
      <StatusIcon className={cn("size-4 shrink-0", statusConfig.color)} />

      {priority && (
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            PRIORITY_DOT[priority] ?? PRIORITY_DOT.medium
          )}
          title={priority}
        />
      )}

      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>

      {completionPercent !== undefined && (
        <div className="flex w-16 shrink-0 items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${Math.min(100, completionPercent)}%` }}
            />
          </div>
          <span className="w-7 text-right font-mono text-[10px] text-muted-foreground">
            {completionPercent}%
          </span>
        </div>
      )}

      {assignedAgent && (
        <AgentIdentity agent={assignedAgent} showLabel={false} size="sm" />
      )}

      {updatedAt && (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </span>
      )}

      <Badge className="shrink-0 text-[10px] capitalize" variant="outline">
        {status.replace(/_/g, " ")}
      </Badge>
    </button>
  );
}
