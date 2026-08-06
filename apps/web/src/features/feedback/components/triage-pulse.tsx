"use client";

import { Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ResultsPopover } from "./triage-results-popover";

interface TriagePulseProps {
  organizationId: Id<"organizations">;
}

const MANY_UNTAGGED_THRESHOLD = 5;

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
          color
        )}
      />
      <span
        className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)}
      />
    </span>
  );
}

function ProcessingIndicator({
  processed,
  total,
  failed,
}: {
  processed: number;
  total: number;
  failed: number;
}) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
            {/* Animated progress ring */}
            <div className="relative h-4 w-4 shrink-0">
              <svg
                aria-label={`Progress: ${percentage}%`}
                className="h-4 w-4 -rotate-90"
                role="img"
                viewBox="0 0 16 16"
              >
                <circle
                  className="stroke-current text-muted"
                  cx="8"
                  cy="8"
                  fill="none"
                  r="6"
                  strokeWidth="2"
                />
                <circle
                  className="stroke-current text-primary transition-all duration-500 ease-out"
                  cx="8"
                  cy="8"
                  fill="none"
                  r="6"
                  strokeDasharray={`${percentage * 0.377} 37.7`}
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Progress text */}
            <div className="flex items-baseline gap-1">
              <span className="font-medium text-xs tabular-nums">
                {processed}
                <span className="text-muted-foreground">/{total}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">tagged</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  failed > 0 ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        }
      />
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">AI auto-tagging in progress</p>
          <p className="text-muted-foreground">
            {processed} of {total} items processed ({percentage}%)
          </p>
          {failed > 0 && <p className="text-amber-500">{failed} failed</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TriagePulse({ organizationId }: TriagePulseProps) {
  const prevJobStatusRef = useRef<string | null>(null);

  const untaggedCount = useQuery(
    api.feedback.auto_tagging.getUntaggedFeedbackCount,
    { organizationId }
  );

  const job = useQuery(api.feedback.auto_tagging.getActiveJob, {
    organizationId,
  });

  const startBulkAutoTagging = useMutation(
    api.feedback.auto_tagging_jobs.startBulkAutoTagging
  );
  const dismissJob = useMutation(api.feedback.auto_tagging_jobs.dismissJob);

  // Fire toast on status transitions
  const jobStatus = job?.status ?? null;
  const jobSuccessful = job?.successfulItems ?? 0;
  const jobFailed = job?.failedItems ?? 0;

  useEffect(() => {
    const prevStatus = prevJobStatusRef.current;
    if (prevStatus === jobStatus) {
      return;
    }

    const wasActive = prevStatus === "pending" || prevStatus === "processing";

    if (jobStatus === "completed" && wasActive) {
      if (jobFailed > 0) {
        toast.warning("Auto-tagging completed with errors", {
          description: `${jobSuccessful} tagged, ${jobFailed} failed`,
        });
      } else {
        toast.success("Auto-tagging complete", {
          description: `${jobSuccessful} feedback items tagged`,
        });
      }
    }

    if (jobStatus === "failed" && wasActive) {
      toast.error("Auto-tagging failed", {
        description: `${jobSuccessful} tagged, ${jobFailed} failed`,
      });
    }

    prevJobStatusRef.current = jobStatus;
  }, [jobStatus, jobSuccessful, jobFailed]);

  const isProcessing =
    job?.status === "pending" || job?.status === "processing";
  const isCompleted = job?.status === "completed" || job?.status === "failed";

  const handleTriage = async () => {
    try {
      await startBulkAutoTagging({ organizationId });
    } catch (error) {
      toast.error("Failed to start auto-tagging", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  // Processing: show animated progress ring + bar
  if (isProcessing && job) {
    const processed = Math.min(job.processedItems, job.totalItems);
    return (
      <ProcessingIndicator
        failed={job.failedItems}
        processed={processed}
        total={job.totalItems}
      />
    );
  }

  const handleDismissJob = () => {
    if (job) {
      dismissJob({ jobId: job._id }).catch(() => {
        // Dismiss errors are non-critical
      });
    }
  };

  // Completed: show clickable results indicator with popover
  if (isCompleted && job) {
    return (
      <ResultsPopover
        failed={job.failedItems}
        onDismiss={handleDismissJob}
        organizationId={organizationId}
        since={job.startedAt}
        successful={job.successfulItems}
      />
    );
  }

  const count = untaggedCount ?? 0;
  const allTriaged = count === 0;
  const manyUntriaged = count >= MANY_UNTAGGED_THRESHOLD;

  let dotColor = "bg-amber-500";
  if (allTriaged) {
    dotColor = "bg-emerald-500";
  } else if (manyUntriaged) {
    dotColor = "bg-red-500";
  }

  // All caught up: calm green dot
  if (allTriaged) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 px-2 text-muted-foreground text-xs">
        <span className={cn("h-2 w-2 rounded-full", dotColor)} />
        <span>All caught up</span>
      </div>
    );
  }

  // Items need review: pulsing dot + action button
  return (
    <Button
      className="shrink-0 gap-1.5"
      onClick={handleTriage}
      size="sm"
      variant="outline"
    >
      <PulsingDot color={dotColor} />
      <Sparkle className="h-3.5 w-3.5" />
      <span>
        {count} need{count === 1 ? "s" : ""} review
      </span>
    </Button>
  );
}
