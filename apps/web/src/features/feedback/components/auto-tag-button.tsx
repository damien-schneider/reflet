"use client";

import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface AutoTagButtonProps {
  organizationId: Id<"organizations">;
}

export function AutoTagButton({ organizationId }: AutoTagButtonProps) {
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

  // Fire toast notifications on status transitions
  const jobStatus = job?.status ?? null;
  const jobSuccessful = job?.successfulItems ?? 0;
  const jobFailed = job?.failedItems ?? 0;

  useEffect(
    function notifyOnStatusTransition() {
      const prevStatus = prevJobStatusRef.current;

      if (prevStatus === jobStatus) {
        return;
      }

      const wasActive = prevStatus === "pending" || prevStatus === "processing";

      // Transition to completed — auto-dismiss the job
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
        if (job) {
          dismissJob({ jobId: job._id }).catch(() => {
            // Dismiss errors are non-critical
          });
        }
      }

      // Transition to failed
      if (jobStatus === "failed" && wasActive) {
        toast.error("Auto-tagging failed", {
          description: `${jobSuccessful} tagged, ${jobFailed} failed`,
        });
        if (job) {
          dismissJob({ jobId: job._id }).catch(() => {
            // Dismiss errors are non-critical
          });
        }
      }

      prevJobStatusRef.current = jobStatus;
    },
    [jobStatus, jobSuccessful, jobFailed, job, dismissJob]
  );

  const handleStartAutoTag = async () => {
    try {
      await startBulkAutoTagging({ organizationId });
    } catch (error) {
      toast.error("Failed to start auto-tagging", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  // Processing state — show inline progress
  const isProcessing =
    job?.status === "pending" || job?.status === "processing";

  if (isProcessing) {
    const processed = Math.min(job.processedItems, job.totalItems);
    return (
      <Button className="shrink-0 gap-1.5" disabled size="sm" variant="outline">
        <ArrowsClockwise className="h-4 w-4 animate-spin" />
        <span>
          Tagging {processed}/{job.totalItems}...
        </span>
      </Button>
    );
  }

  // Don't show button if no untagged items or still loading
  if (untaggedCount === undefined || untaggedCount === 0) {
    return null;
  }

  return (
    <Button
      className="shrink-0 gap-1.5"
      onClick={handleStartAutoTag}
      size="sm"
      variant="outline"
    >
      <Sparkle className="h-4 w-4" />
      <span>Auto-tag {untaggedCount}</span>
    </Button>
  );
}
