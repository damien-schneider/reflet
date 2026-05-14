"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";

import { getStatusEntry } from "@/features/autopilot/components/tasks/inline-status-popover";
import { WorkItemIdentifier } from "@/features/autopilot/components/tasks/work-item-identifier";
import { cn } from "@/lib/utils";

export function SubtasksSection({
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
    <section className="space-y-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Subtasks ({subtasks.length})
      </h2>
      <div className="space-y-1.5">
        {subtasks.map((sub) => {
          const subStatus = getStatusEntry(sub.status);
          const SubIcon = subStatus.icon;
          return (
            <Link
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              href={`/dashboard/${orgSlug}/tasks/${sub._id}`}
              key={sub._id}
              prefetch
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
