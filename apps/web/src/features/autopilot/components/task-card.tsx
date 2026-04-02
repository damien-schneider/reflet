"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconLoader2,
  IconPlayerPause,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: {
    icon: IconCircleDashed,
    color: "text-muted-foreground",
    label: "Pending",
  },
  in_progress: {
    icon: IconLoader2,
    color: "text-blue-500",
    label: "In Progress",
  },
  blocked: {
    icon: IconPlayerPause,
    color: "text-yellow-500",
    label: "Blocked",
  },
  waiting_review: {
    icon: IconCircleDashed,
    color: "text-purple-500",
    label: "Review",
  },
  completed: {
    icon: IconCircleCheck,
    color: "text-green-500",
    label: "Completed",
  },
  failed: { icon: IconCircleX, color: "text-red-500", label: "Failed" },
  cancelled: {
    icon: IconCircleX,
    color: "text-muted-foreground",
    label: "Cancelled",
  },
} as const;

const PRIORITY_STYLES = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
} as const;

const AGENT_LABELS = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  security: "Security",
  architect: "Architect",
  growth: "Growth",
  orchestrator: "System",
} as const;

export function TaskCard({
  baseUrl,
  task,
}: {
  baseUrl: string;
  task: Doc<"autopilotTasks">;
}) {
  const statusConfig =
    STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const priorityStyle =
    PRIORITY_STYLES[task.priority as keyof typeof PRIORITY_STYLES] ??
    PRIORITY_STYLES.low;
  const agentLabel =
    AGENT_LABELS[task.assignedAgent as keyof typeof AGENT_LABELS] ??
    task.assignedAgent;

  return (
    <Link
      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
      href={`${baseUrl}/tasks/${task._id}`}
    >
      <div className="flex items-start gap-3">
        <StatusIcon
          className={cn("mt-0.5 size-5 shrink-0", statusConfig.color)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", priorityStyle)} variant="outline">
              {task.priority}
            </Badge>
            <Badge variant="secondary">{agentLabel}</Badge>
            {task.prUrl && <Badge variant="outline">PR</Badge>}
          </div>
          <h3 className="mt-1.5 font-medium">{task.title}</h3>
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {task.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
            <span>{statusConfig.label}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(task.createdAt, { addSuffix: true })}
            </span>
            {task.estimatedCostUsd !== undefined &&
              task.estimatedCostUsd > 0 && (
                <>
                  <span>·</span>
                  <span>${task.estimatedCostUsd.toFixed(3)}</span>
                </>
              )}
          </div>
        </div>
      </div>
    </Link>
  );
}
