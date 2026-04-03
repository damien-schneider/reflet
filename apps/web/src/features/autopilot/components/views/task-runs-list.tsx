"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const RUN_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  cancelled: "bg-muted text-muted-foreground",
};

const CI_STATUS_STYLES: Record<string, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-500",
  passed: "text-green-500",
  failed: "text-red-500",
};

export function TaskRunsList({ taskId }: { taskId: Id<"autopilotTasks"> }) {
  const runs = useQuery(api.autopilot.queries.getTaskRuns, { taskId });

  if (runs === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            className="h-16 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No runs yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div className="rounded-lg border p-3" key={run._id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                className={cn("text-xs", RUN_STATUS_STYLES[run.status])}
                variant="secondary"
              >
                {run.status}
              </Badge>
              <Badge variant="outline">{run.adapter}</Badge>
              {run.ciStatus && (
                <span className={cn("text-xs", CI_STATUS_STYLES[run.ciStatus])}>
                  CI: {run.ciStatus}
                </span>
              )}
            </div>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(run.startedAt, { addSuffix: true })}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
            {run.branch && <span className="font-mono">{run.branch}</span>}
            {run.prUrl && (
              <a
                className="text-blue-500 underline"
                href={run.prUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                PR #{run.prNumber}
              </a>
            )}
            <span>{run.tokensUsed.toLocaleString()} tokens</span>
            <span>${run.estimatedCostUsd.toFixed(3)}</span>
          </div>
          {run.errorMessage && (
            <p className="mt-1 text-red-500 text-xs">{run.errorMessage}</p>
          )}
        </div>
      ))}
    </div>
  );
}
