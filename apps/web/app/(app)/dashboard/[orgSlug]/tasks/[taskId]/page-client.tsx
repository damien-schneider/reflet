"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { TaskDetailContent } from "@/features/autopilot/components/tasks/task-detail-content";
import { toOptionalId } from "@/lib/convex-helpers";

export default function TaskDetailPageClient({ taskId }: { taskId: string }) {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string | undefined) ?? "";
  const workItemId = toOptionalId("autopilotWorkItems", taskId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href={`/dashboard/${orgSlug}/tasks`}
      >
        <IconArrowLeft className="size-4" />
        Back to tasks
      </Link>

      {workItemId ? (
        <TaskDetailContent workItemId={workItemId} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Muted>Task not found</Muted>
          <Link href={`/dashboard/${orgSlug}/tasks`}>
            <Button size="sm" variant="outline">
              <IconArrowLeft className="size-4" />
              Back to tasks
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
