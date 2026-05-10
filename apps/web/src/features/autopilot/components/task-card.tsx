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
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineAssigneePopover } from "@/features/autopilot/components/tasks/inline-assignee-popover";
import { InlineLabelsPopover } from "@/features/autopilot/components/tasks/inline-labels-popover";
import { InlinePriorityPopover } from "@/features/autopilot/components/tasks/inline-priority-popover";
import {
  getStatusEntry,
  InlineStatusPopover,
} from "@/features/autopilot/components/tasks/inline-status-popover";
import { TaskDetailSheet } from "@/features/autopilot/components/tasks/task-detail-sheet";
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { cn } from "@/lib/utils";

export function TaskCard({ task }: { task: Doc<"autopilotWorkItems"> }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const params = useParams();
  const orgSlug = (params?.orgSlug as string | undefined) ?? "";

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

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      if (orgSlug) {
        window.open(`/dashboard/${orgSlug}/tasks/${task._id}`, "_blank");
      }
      return;
    }
    setDetailOpen(true);
  };

  const labelIds = (labelLinks ?? []).map((label) => label._id);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: card container with nested popovers and buttons cannot be a <button> */}
      <div
        className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        onClick={handleCardClick}
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

      <TaskDetailSheet
        onOpenChange={setDetailOpen}
        open={detailOpen}
        workItemId={task._id}
      />
    </>
  );
}
