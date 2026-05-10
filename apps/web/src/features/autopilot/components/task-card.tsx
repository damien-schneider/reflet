"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconDots,
  IconExternalLink,
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
import { AgentIdentity } from "@/features/autopilot/components/agent-identity";
import { InlineAssigneePopover } from "@/features/autopilot/components/tasks/inline-assignee-popover";
import { InlineLabelsPopover } from "@/features/autopilot/components/tasks/inline-labels-popover";
import {
  getPriorityEntry,
  InlinePriorityPopover,
} from "@/features/autopilot/components/tasks/inline-priority-popover";
import {
  getStatusEntry,
  InlineStatusPopover,
} from "@/features/autopilot/components/tasks/inline-status-popover";
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { TaskRunsList } from "@/features/autopilot/components/views/task-runs-list";
import { cn } from "@/lib/utils";

function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Doc<"autopilotWorkItems">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const subtasks = useQuery(
    api.autopilot.queries.work.getChildren,
    open ? { parentId: task._id } : "skip"
  );

  const statusEntry = getStatusEntry(task.status);
  const priorityEntry = getPriorityEntry(task.priority);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WorkItemIdentifier identifier={task.identifier} />
            <Badge
              className={cn("text-xs", priorityEntry.badgeClass)}
              variant="outline"
            >
              {priorityEntry.label}
            </Badge>
            <AgentIdentity agent={task.assignedAgent ?? "system"} />
            <Badge
              className={cn("text-xs", statusEntry.color)}
              variant="outline"
            >
              {statusEntry.label}
            </Badge>
          </div>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span suppressHydrationWarning>
              Created {formatDistanceToNow(task.createdAt, { addSuffix: true })}
            </span>
            <span suppressHydrationWarning>
              Updated {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
            </span>
          </div>

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
                  const subStatus = getStatusEntry(sub.status);
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

export function TaskCard({ task }: { task: Doc<"autopilotWorkItems"> }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const updateWorkItem = useMutation(
    api.autopilot.mutations.work.updateWorkItem
  );
  const labelLinks = useQuery(api.autopilot.queries.labels.listWorkItemLabels, {
    workItemId: task._id,
  });

  const statusEntry = getStatusEntry(task.status);
  const StatusIcon = statusEntry.icon;

  const canCancel =
    task.status === "triage" ||
    task.status === "backlog" ||
    task.status === "todo" ||
    task.status === "in_progress";
  const canRetry = task.status === "cancelled";

  const handleCancel = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updateWorkItem({ workItemId: task._id, status: "cancelled" });
      toast.success("Task cancelled");
    } catch {
      toast.error("Failed to cancel task");
    }
  };

  const handleRetry = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updateWorkItem({ workItemId: task._id, status: "todo" });
      toast.success("Task re-queued");
    } catch {
      toast.error("Failed to retry task");
    }
  };

  const handleViewDetails = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDetailOpen(true);
  };

  const handleOpenPr = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (task.prUrl) {
      window.open(task.prUrl, "_blank");
    }
  };

  const labelIds = (labelLinks ?? []).map((label) => label._id);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: card container with nested popovers and buttons cannot be a <button> */}
      <div
        className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        onClick={() => setDetailOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setDetailOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <StatusIcon
          className={cn("mt-0.5 size-5 shrink-0", statusEntry.color)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <WorkItemIdentifier identifier={task.identifier} />
            <h3 className="font-medium">{task.title}</h3>
          </div>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {task.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <InlineStatusPopover status={task.status} workItemId={task._id} />
            <InlinePriorityPopover
              priority={task.priority}
              workItemId={task._id}
            />
            <InlineAssigneePopover
              assignedAgent={task.assignedAgent}
              assigneeUserId={task.assigneeUserId}
              organizationId={task.organizationId}
              workItemId={task._id}
            />
            <InlineLabelsPopover
              labelIds={labelIds}
              organizationId={task.organizationId}
              workItemId={task._id}
            />
            {task.prUrl ? <Badge variant="outline">PR</Badge> : null}
            <span className="text-muted-foreground" suppressHydrationWarning>
              {formatDistanceToNow(task.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Inline actions */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper traps bubbling clicks from nested buttons */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: wrapper traps bubbling clicks from nested buttons */}
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {canRetry && (
            <Button
              aria-label="Retry task"
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
              aria-label="Cancel task"
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
                  aria-label="Open task actions"
                  className="size-7"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <IconDots className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                View details
              </DropdownMenuItem>
              {task.prUrl && (
                <DropdownMenuItem onClick={handleOpenPr}>
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
