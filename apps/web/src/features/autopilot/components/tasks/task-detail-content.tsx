"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconChevronRight, IconExternalLink, IconX } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { H2, Muted } from "@/components/ui/typography";
import { InlineAssigneePopover } from "@/features/autopilot/components/tasks/inline-assignee-popover";
import { InlineLabelsPopover } from "@/features/autopilot/components/tasks/inline-labels-popover";
import { InlinePriorityPopover } from "@/features/autopilot/components/tasks/inline-priority-popover";
import {
  getStatusEntry,
  InlineStatusPopover,
} from "@/features/autopilot/components/tasks/inline-status-popover";
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { TaskRunsList } from "@/features/autopilot/components/views/task-runs-list";
import { getAutopilotErrorMessage } from "@/features/autopilot/lib/error-messages";
import { cn } from "@/lib/utils";

const PARENT_CHAIN_MAX_DEPTH = 5;

export function TaskDetailContent({
  workItemId,
}: {
  workItemId: Id<"autopilotWorkItems">;
}) {
  const task = useQuery(api.autopilot.queries.work.getWorkItem, { workItemId });

  if (task === undefined) {
    return <TaskDetailSkeleton />;
  }

  if (task === null) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Muted>Task not found</Muted>
      </div>
    );
  }

  return <TaskDetailBody task={task} />;
}

function TaskDetailBody({ task }: { task: Doc<"autopilotWorkItems"> }) {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string | undefined) ?? "";

  const subtasks = useQuery(api.autopilot.queries.work.getChildren, {
    parentId: task._id,
  });
  const labelLinks = useQuery(api.autopilot.queries.labels.listWorkItemLabels, {
    workItemId: task._id,
  });
  const updateWorkItem = useMutation(
    api.autopilot.mutations.work.updateWorkItem
  );

  const labelIds = (labelLinks ?? []).map((label) => label._id);
  const statusEntry = getStatusEntry(task.status);
  const StatusIcon = statusEntry.icon;

  const canCancel =
    task.status === "triage" ||
    task.status === "backlog" ||
    task.status === "todo" ||
    task.status === "in_progress";

  const handleCancel = async () => {
    try {
      await updateWorkItem({ workItemId: task._id, status: "cancelled" });
      toast.success("Task cancelled");
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, { fallback: "Failed to cancel task" })
      );
    }
  };

  return (
    <div className="space-y-6">
      <ParentBreadcrumb orgSlug={orgSlug} parentId={task.parentId ?? null} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <WorkItemIdentifier identifier={task.identifier} />
          <span
            className="text-muted-foreground text-xs"
            suppressHydrationWarning
          >
            Created {formatDistanceToNow(task.createdAt, { addSuffix: true })}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span
            className="text-muted-foreground text-xs"
            suppressHydrationWarning
          >
            Updated {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <StatusIcon
            className={cn("mt-1 size-6 shrink-0", statusEntry.color)}
          />
          <h1 className="font-semibold text-2xl leading-tight">{task.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {task.prUrl ? (
            <a
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted"
              href={task.prUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-4" />
              Pull Request {task.prNumber ? `#${task.prNumber}` : ""}
            </a>
          ) : null}
          {canCancel ? (
            <Button onClick={handleCancel} size="sm" variant="destructive">
              <IconX className="size-4" />
              Cancel task
            </Button>
          ) : null}
        </div>
      </header>

      <Separator />

      <section>
        <H2 className="mb-2" variant="card">
          Description
        </H2>
        {task.description ? (
          <TiptapMarkdownEditor
            editable={false}
            minimal
            value={task.description}
          />
        ) : (
          <Muted>No description.</Muted>
        )}
      </section>

      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? (
        <section>
          <H2 className="mb-2" variant="card">
            Acceptance criteria
          </H2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {task.acceptanceCriteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {task.completionPercent !== undefined && task.completionPercent > 0 ? (
        <section>
          <Muted className="text-sm">Progress: {task.completionPercent}%</Muted>
        </section>
      ) : null}

      <SubtasksSection orgSlug={orgSlug} subtasks={subtasks} />

      <section>
        <H2 className="mb-3" variant="card">
          Runs
        </H2>
        <TaskRunsList taskId={task._id} />
      </section>
    </div>
  );
}

function SubtasksSection({
  orgSlug,
  subtasks,
}: {
  orgSlug: string;
  subtasks: Doc<"autopilotWorkItems">[] | undefined;
}) {
  if (subtasks === undefined || subtasks.length === 0) {
    return null;
  }
  return (
    <section>
      <H2 className="mb-3" variant="card">
        Subtasks ({subtasks.length})
      </H2>
      <div className="space-y-2">
        {subtasks.map((sub) => {
          const subStatus = getStatusEntry(sub.status);
          const SubIcon = subStatus.icon;
          return (
            <Link
              className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
              href={`/dashboard/${orgSlug}/tasks/${sub._id}`}
              key={sub._id}
            >
              <SubIcon className={cn("size-4 shrink-0", subStatus.color)} />
              <WorkItemIdentifier identifier={sub.identifier} />
              <span className="flex-1 truncate">{sub.title}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {subStatus.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ParentBreadcrumb({
  orgSlug,
  parentId,
}: {
  orgSlug: string;
  parentId: Id<"autopilotWorkItems"> | null;
}) {
  const chain = useParentChain(parentId);
  if (chain.length === 0) {
    return null;
  }
  return (
    <nav
      aria-label="Parent chain"
      className="flex flex-wrap items-center gap-1 text-muted-foreground text-xs"
    >
      {chain.map((ancestor, index) => (
        <span className="inline-flex items-center gap-1" key={ancestor._id}>
          <Link
            className="rounded-sm px-1 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground"
            href={`/dashboard/${orgSlug}/tasks/${ancestor._id}`}
          >
            {ancestor.identifier ? (
              <span className="font-mono">{ancestor.identifier}</span>
            ) : null}
            <span className={cn(ancestor.identifier && "ml-1.5")}>
              {ancestor.title}
            </span>
          </Link>
          {index < chain.length - 1 ? (
            <IconChevronRight aria-hidden className="size-3" />
          ) : null}
        </span>
      ))}
    </nav>
  );
}

function useParentChain(
  parentId: Id<"autopilotWorkItems"> | null
): Doc<"autopilotWorkItems">[] {
  // Recursion is unsupported in hooks — we statically unroll up to the max depth.
  const a0 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    parentId ? { workItemId: parentId } : "skip"
  );
  const a1 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a0?.parentId ? { workItemId: a0.parentId } : "skip"
  );
  const a2 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a1?.parentId ? { workItemId: a1.parentId } : "skip"
  );
  const a3 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a2?.parentId ? { workItemId: a2.parentId } : "skip"
  );
  const a4 = useQuery(
    api.autopilot.queries.work.getWorkItem,
    a3?.parentId ? { workItemId: a3.parentId } : "skip"
  );

  const ancestors = [a4, a3, a2, a1, a0]
    .filter((entry): entry is Doc<"autopilotWorkItems"> => Boolean(entry))
    .slice(-PARENT_CHAIN_MAX_DEPTH);
  return ancestors;
}

function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" data-testid="task-detail-skeleton" />
      <Skeleton className="h-8 w-3/4" data-testid="task-detail-skeleton" />
      <Skeleton className="h-24 w-full" data-testid="task-detail-skeleton" />
      <Skeleton className="h-40 w-full" data-testid="task-detail-skeleton" />
    </div>
  );
}
