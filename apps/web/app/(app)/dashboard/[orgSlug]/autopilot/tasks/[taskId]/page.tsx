"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconCircleX,
  IconExternalLink,
  IconLoader2,
  IconPlayerPause,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  backlog: {
    icon: IconCircleDashed,
    color: "text-muted-foreground",
    label: "Backlog",
  },
  todo: {
    icon: IconCircleDashed,
    color: "text-muted-foreground",
    label: "To Do",
  },
  in_progress: {
    icon: IconLoader2,
    color: "text-blue-500",
    label: "In Progress",
  },
  in_review: {
    icon: IconPlayerPause,
    color: "text-purple-500",
    label: "In Review",
  },
  done: {
    icon: IconCircleCheck,
    color: "text-green-500",
    label: "Done",
  },
  cancelled: {
    icon: IconCircleX,
    color: "text-muted-foreground",
    label: "Cancelled",
  },
} as const;

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);

  const task = useQuery(api.autopilot.queries.work.getWorkItem, {
    workItemId: taskId as Id<"autopilotWorkItems">,
  });

  const subtasks = useQuery(
    api.autopilot.queries.work.getChildren,
    task ? { parentId: task._id } : "skip"
  );

  const runs = useQuery(
    api.autopilot.queries.work.getWorkItemRuns,
    task ? { workItemId: task._id } : "skip"
  );

  const cancelTask = useMutation(api.autopilot.mutations.work.updateWorkItem);

  if (task === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Muted>Task not found</Muted>
      </div>
    );
  }

  const statusConfig =
    STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.backlog;
  const StatusIcon = statusConfig.icon;

  const canCancel =
    task.status === "backlog" ||
    task.status === "todo" ||
    task.status === "in_progress";

  const handleCancel = async () => {
    try {
      await cancelTask({ workItemId: task._id, status: "cancelled" });
      toast.success("Task cancelled");
    } catch {
      toast.error("Failed to cancel task");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("size-6 shrink-0", statusConfig.color)} />
            <div>
              <h1 className="font-bold text-xl">{task.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                <Badge variant="outline">{task.priority}</Badge>
                <Badge variant="secondary">{task.assignedAgent}</Badge>
                <span>·</span>
                <span>
                  {formatDistanceToNow(task.createdAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.prUrl && (
              <a
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted"
                href={task.prUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <IconExternalLink className="mr-1 size-4" />
                PR #{task.prNumber}
              </a>
            )}
            {canCancel && (
              <Button onClick={handleCancel} size="sm" variant="destructive">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <section>
        <H2 className="mb-2" variant="card">
          Description
        </H2>
        <TiptapMarkdownEditor
          editable={false}
          minimal
          value={task.description}
        />
      </section>

      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
        <section>
          <H2 className="mb-2" variant="card">
            Acceptance Criteria
          </H2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {task.acceptanceCriteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
        </section>
      )}

      {task.completionPercent !== undefined && task.completionPercent > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 text-muted-foreground text-sm">
            <span>Progress: {task.completionPercent}%</span>
          </div>
        </section>
      )}

      {subtasks && subtasks.length > 0 && (
        <section>
          <H2 className="mb-3" variant="card">
            Subtasks
          </H2>
          <div className="space-y-2">
            {subtasks.map((sub) => {
              const subStatus =
                STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] ??
                STATUS_CONFIG.backlog;
              const SubIcon = subStatus.icon;
              return (
                <div
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={sub._id}
                >
                  <SubIcon className={cn("size-4 shrink-0", subStatus.color)} />
                  <span className="text-sm">{sub.title}</span>
                  <Badge className="ml-auto" variant="secondary">
                    {sub.assignedAgent}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {runs && runs.length > 0 && (
        <section>
          <H2 className="mb-3" variant="card">
            Runs
          </H2>
          <div className="space-y-2">
            {runs.map((run) => (
              <div className="rounded-lg border p-3 text-sm" key={run._id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{run.adapter}</Badge>
                    <Badge variant="secondary">{run.status}</Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                  </span>
                </div>
                {run.prUrl && (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                    href={run.prUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    PR #{run.prNumber} <IconExternalLink className="size-3" />
                  </a>
                )}
                {run.errorMessage && (
                  <p className="mt-1 text-red-500">{run.errorMessage}</p>
                )}
                {run.estimatedCostUsd > 0 && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Cost: ${run.estimatedCostUsd.toFixed(3)} ·{" "}
                    {run.tokensUsed.toLocaleString()} tokens
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
