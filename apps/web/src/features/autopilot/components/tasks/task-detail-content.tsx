"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChevronRight,
  IconExternalLink,
  IconPlus,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { Muted } from "@/components/ui/typography";
import { ActivitySection } from "@/features/autopilot/components/tasks/detail/activity-section";
import { ParentBreadcrumb } from "@/features/autopilot/components/tasks/detail/parent-breadcrumb";
import { PropertiesSidebar } from "@/features/autopilot/components/tasks/detail/properties-sidebar";
import { TaskDetailSkeleton } from "@/features/autopilot/components/tasks/detail/skeleton";
import { SubtasksSection } from "@/features/autopilot/components/tasks/detail/subtasks-section";
import { getStatusEntry } from "@/features/autopilot/components/tasks/inline-status-popover";
import { QuickCreateDialog } from "@/features/autopilot/components/tasks/quick-create-dialog";
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { getAutopilotErrorMessage } from "@/features/autopilot/lib/error-messages";
import { cn } from "@/lib/utils";

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
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : "";
  const [subIssueOpen, setSubIssueOpen] = useState(false);

  const subtasks = useQuery(api.autopilot.queries.work.getChildren, {
    parentId: task._id,
  });
  const labelLinks = useQuery(api.autopilot.queries.labels.listWorkItemLabels, {
    workItemId: task._id,
  });
  const activity = useQuery(
    api.autopilot.queries.activity.listWorkItemActivity,
    { workItemId: task._id }
  );
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
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col rounded-xl border bg-card/70 shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href={`/dashboard/${orgSlug}/tasks`}
          >
            Tasks
          </Link>
          <IconChevronRight
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
          {task.identifier ? (
            <WorkItemIdentifier identifier={task.identifier} />
          ) : null}
          <span className="line-clamp-1 max-w-[40ch] text-foreground">
            {task.title}
          </span>
        </div>
        {task.prUrl ? (
          <Button
            className="size-7"
            render={
              <a href={task.prUrl} rel="noopener noreferrer" target="_blank">
                <span className="sr-only">Open pull request</span>
              </a>
            }
            size="icon-sm"
            variant="ghost"
          >
            <IconExternalLink className="size-3.5" />
          </Button>
        ) : null}
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8 lg:px-10 lg:py-12">
          <ParentBreadcrumb
            orgSlug={orgSlug}
            parentId={task.parentId ?? null}
          />

          <div className="flex items-start gap-4">
            <StatusIcon
              className={cn("mt-2 size-7 shrink-0", statusEntry.color)}
            />
            <h1 className="font-semibold text-3xl leading-tight tracking-tight">
              {task.title}
            </h1>
          </div>

          <section className="space-y-3">
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

          <Button
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSubIssueOpen(true)}
            size="sm"
            variant="ghost"
          >
            <IconPlus className="size-4" />
            Add sub-issues
          </Button>

          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Acceptance criteria
              </h2>
              <ul className="space-y-1.5 text-sm">
                {task.acceptanceCriteria.map((criterion) => (
                  <li className="flex gap-2" key={criterion}>
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <SubtasksSection orgSlug={orgSlug} subtasks={subtasks} />

          <Separator />

          <ActivitySection activity={activity} task={task} />
        </div>

        <PropertiesSidebar
          canCancel={canCancel}
          labelIds={labelIds}
          onCancel={handleCancel}
          orgSlug={orgSlug}
          task={task}
        />
      </div>
      <QuickCreateDialog
        onOpenChange={setSubIssueOpen}
        open={subIssueOpen}
        organizationId={task.organizationId}
        parentId={task._id}
      />
    </div>
  );
}
