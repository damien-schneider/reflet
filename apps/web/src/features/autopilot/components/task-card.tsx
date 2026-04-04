"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconDots,
  IconExternalLink,
  IconLoader2,
  IconPlayerPause,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskRunsList } from "@/features/autopilot/components/views/task-runs-list";
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

const AGENT_LABELS: Record<string, string> = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  security: "Security",
  architect: "Architect",
  growth: "Growth",
  support: "Support",
  docs: "Docs",
  sales: "Sales",
  system: "System",
};

function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Doc<"autopilotTasks">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const subtasks = useQuery(
    api.autopilot.queries.tasks.getSubtasks,
    open ? { parentTaskId: task._id } : "skip"
  );

  const statusConfig =
    STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-xs",
                PRIORITY_STYLES[
                  task.priority as keyof typeof PRIORITY_STYLES
                ] ?? PRIORITY_STYLES.low
              )}
              variant="outline"
            >
              {task.priority}
            </Badge>
            <Badge variant="secondary">
              {AGENT_LABELS[task.assignedAgent] ?? task.assignedAgent}
            </Badge>
            <Badge
              className={cn("text-xs", statusConfig.color)}
              variant="outline"
            >
              {statusConfig.label}
            </Badge>
          </div>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span>
              Created {formatDistanceToNow(task.createdAt, { addSuffix: true })}
            </span>
            {task.startedAt && (
              <span>
                Started{" "}
                {formatDistanceToNow(task.startedAt, { addSuffix: true })}
              </span>
            )}
            {task.completedAt && (
              <span>
                Finished{" "}
                {formatDistanceToNow(task.completedAt, { addSuffix: true })}
              </span>
            )}
            {task.estimatedCostUsd !== undefined &&
              task.estimatedCostUsd > 0 && (
                <span>${task.estimatedCostUsd.toFixed(3)}</span>
              )}
          </div>

          {/* Error message */}
          {task.errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="font-medium text-red-500 text-xs">Error</p>
              <p className="mt-1 text-red-400 text-sm">{task.errorMessage}</p>
            </div>
          )}

          {/* PR link */}
          {task.prUrl && (
            <a
              className="inline-flex items-center gap-1.5 text-blue-500 text-sm underline"
              href={task.prUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-3.5" />
              Pull Request {task.prNumber ? `#${task.prNumber}` : ""}
            </a>
          )}

          {/* Subtasks */}
          {subtasks && subtasks.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-sm">Subtasks</p>
              <div className="space-y-1">
                {subtasks.map((sub) => {
                  const subStatus =
                    STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] ??
                    STATUS_CONFIG.pending;
                  const SubIcon = subStatus.icon;
                  return (
                    <div
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      key={sub._id}
                    >
                      <SubIcon
                        className={cn("size-4 shrink-0", subStatus.color)}
                      />
                      <span className="flex-1 truncate">{sub.title}</span>
                      <Badge variant="outline">{subStatus.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Runs */}
          <div>
            <p className="mb-2 font-medium text-sm">Runs</p>
            <TaskRunsList taskId={task._id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskCard({ task }: { task: Doc<"autopilotTasks"> }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const cancelTask = useMutation(api.autopilot.mutations.tasks.cancelTask);
  const retryTask = useMutation(api.autopilot.mutations.tasks.retryTask);

  const statusConfig =
    STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const priorityStyle =
    PRIORITY_STYLES[task.priority as keyof typeof PRIORITY_STYLES] ??
    PRIORITY_STYLES.low;
  const agentLabel = AGENT_LABELS[task.assignedAgent] ?? task.assignedAgent;

  const canCancel =
    task.status === "pending" ||
    task.status === "in_progress" ||
    task.status === "blocked";
  const canRetry = task.status === "failed" || task.status === "cancelled";

  const handleCancel = async () => {
    try {
      await cancelTask({ taskId: task._id });
      toast.success("Task cancelled");
    } catch {
      toast.error("Failed to cancel task");
    }
  };

  const handleRetry = async () => {
    try {
      await retryTask({ taskId: task._id });
      toast.success("Task re-queued");
    } catch {
      toast.error("Failed to retry task");
    }
  };

  return (
    <>
      <div className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
        <button
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
          onClick={() => setDetailOpen(true)}
          type="button"
        >
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
            {task.errorMessage && (
              <p className="mt-1 line-clamp-1 text-red-500 text-xs">
                {task.errorMessage}
              </p>
            )}
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
        </button>

        {/* Inline actions */}
        <div className="flex shrink-0 items-center gap-1">
          {canRetry && (
            <Button
              className="size-7"
              onClick={handleRetry}
              size="icon-sm"
              title="Retry task"
              variant="ghost"
            >
              <IconRefresh className="size-4" />
            </Button>
          )}
          {canCancel && (
            <Button
              className="size-7 text-destructive hover:text-destructive"
              onClick={handleCancel}
              size="icon-sm"
              title="Cancel task"
              variant="ghost"
            >
              <IconX className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  className="size-7 opacity-0 group-hover:opacity-100"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <IconDots className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailOpen(true)}>
                View details
              </DropdownMenuItem>
              {task.prUrl && (
                <DropdownMenuItem
                  onClick={() => {
                    if (task.prUrl) {
                      window.open(task.prUrl, "_blank");
                    }
                  }}
                >
                  <IconExternalLink className="size-4" />
                  Open PR
                </DropdownMenuItem>
              )}
              {canRetry && (
                <DropdownMenuItem onClick={handleRetry}>
                  <IconRefresh className="size-4" />
                  Retry
                </DropdownMenuItem>
              )}
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleCancel}
                    variant="destructive"
                  >
                    <IconX className="size-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TaskDetailDialog
        onOpenChange={setDetailOpen}
        open={detailOpen}
        task={task}
      />
    </>
  );
}
