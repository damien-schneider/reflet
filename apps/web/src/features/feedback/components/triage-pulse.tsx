"use client";

import { Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ProcessingIndicator,
  PulsingDot,
  ResultsPopover,
} from "@/features/feedback/components/triage-pulse-views";
import { cn } from "@/lib/utils";

interface TriagePulseProps {
  organizationId: Id<"organizations">;
}

const MANY_UNTAGGED_THRESHOLD = 5;

export function TriagePulse({ organizationId }: TriagePulseProps) {
  const prevJobStatusRef = useRef<string | null>(null);

  const untaggedCount = useQuery(
    api.feedback.auto_tagging_queries.getUntaggedFeedbackCount,
    { organizationId }
  );

  const job = useQuery(api.feedback.auto_tagging_queries.getActiveJob, {
    organizationId,
  });

  const startBulkAutoTagging = useMutation(
    api.feedback.auto_tagging_mutations.startBulkAutoTagging
  );
  const dismissJob = useMutation(
    api.feedback.auto_tagging_mutations.dismissJob
  );

  // Fire toast on status transitions
  const jobStatus = job?.status ?? null;
  const jobSuccessful = job?.successfulItems ?? 0;
  const jobFailed = job?.failedItems ?? 0;

  useEffect(
    function notifyOnJobStatusTransition() {
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
    },
    [jobStatus, jobSuccessful, jobFailed]
  );

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
