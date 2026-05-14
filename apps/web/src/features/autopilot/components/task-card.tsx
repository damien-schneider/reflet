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
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { cn } from "@/lib/utils";

export function TaskCard({ task }: { task: Doc<"autopilotWorkItems"> }) {
  const params = useParams();
  const { push } = useRouter();
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : "";
  const taskHref = orgSlug ? `/dashboard/${orgSlug}/tasks/${task._id}` : "#";

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
    if (orgSlug) {
      push(taskHref);
    }
  };

  const handleOpenPr = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (task.prUrl) {
      window.open(task.prUrl, "_blank");
    }
  };

  const labelIds = (labelLinks ?? []).map((label) => label._id);
  const hasAssignee =
    task.assignedAgent !== undefined || task.assigneeUserId !== undefined;

  return (
    <div className="group relative grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-1.5">
      <Link
        aria-label={`Open task ${task.identifier ?? task.title}`}
        className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={taskHref}
        prefetch
      />
      <div className="relative z-10 flex min-w-0 items-center gap-2">
        <InlineStatusPopover
          showLabel={false}
          status={task.status}
          workItemId={task._id}
        />
        <WorkItemIdentifier
          className="hidden shrink-0 sm:inline-flex"
          identifier={task.identifier}
        />
        <h3 className="truncate font-medium text-sm leading-5">{task.title}</h3>
      </div>

      <div className="relative z-10 flex min-w-0 shrink-0 items-center justify-end gap-1.5 text-xs">
        <div className="hidden items-center gap-1.5 md:flex">
          <InlinePriorityPopover
            priority={task.priority}
            showLabel={false}
            workItemId={task._id}
          />
          {hasAssignee ? (
            <InlineAssigneePopover
              assignedAgent={task.assignedAgent}
              assigneeUserId={task.assigneeUserId}
              organizationId={task.organizationId}
              workItemId={task._id}
            />
          ) : null}
          {labelIds.length > 0 ? (
            <InlineLabelsPopover
              labelIds={labelIds}
              organizationId={task.organizationId}
              workItemId={task._id}
            />
          ) : null}
          {task.prUrl ? <Badge variant="outline">PR</Badge> : null}
          <span
            className="min-w-16 text-right text-muted-foreground"
            suppressHydrationWarning
          >
            {formatDistanceToNow(task.createdAt, { addSuffix: true })}
          </span>
        </div>

        <StatusIcon
          className={cn("size-4 shrink-0 md:hidden", statusEntry.color)}
        />
        {canRetry && (
          <Button
            aria-label="Retry task"
            className="size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
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
            className="size-7 text-destructive opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
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
                className="size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
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
                <DropdownMenuItem onClick={handleCancel} variant="destructive">
                  <IconX className="size-4" />
                  Cancel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
