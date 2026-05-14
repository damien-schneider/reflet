"use client";

import { useParams } from "next/navigation";

import { Muted } from "@/components/ui/typography";
import { TaskDetailContent } from "@/features/autopilot/components/tasks/task-detail-content";
import { toOptionalId } from "@/lib/convex-helpers";

export default function TaskDetailPageClient({ taskId }: { taskId: string }) {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string | undefined) ?? "";
  const workItemId = toOptionalId("autopilotWorkItems", taskId);

  if (!workItemId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Muted>Task not found</Muted>
        <a
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 font-medium text-sm transition-colors hover:bg-muted"
          href={`/dashboard/${orgSlug}/tasks`}
        >
          Back to tasks
        </a>
      </div>
    );
  }

  return <TaskDetailContent workItemId={workItemId} />;
}
