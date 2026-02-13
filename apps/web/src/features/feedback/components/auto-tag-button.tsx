"use client";

import {
  ArrowsClockwise,
  Check,
  Info,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutoTagButtonProps {
  organizationId: Id<"organizations">;
}

interface AutoTagJob {
  _id: Id<"autoTaggingJobs">;
  status: "pending" | "processing" | "completed" | "failed";
  processedItems: number;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  errors: Array<{ feedbackId: string; error: string }>;
}

function ProcessingJobButton({
  processed,
  total,
}: {
  processed: number;
  total: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button disabled size="icon-sm" variant="ghost">
            <ArrowsClockwise className="h-4 w-4 animate-spin" />
          </Button>
        }
      />
      <TooltipContent>
        Auto-tagging... {processed}/{total}
      </TooltipContent>
    </Tooltip>
  );
}

function CompletedJobButton({
  isFailed,
  onShowDetails,
}: {
  isFailed: boolean;
  onShowDetails: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button onClick={onShowDetails} size="icon-sm" variant="ghost">
            {isFailed ? (
              <Warning className="h-4 w-4 text-destructive" weight="bold" />
            ) : (
              <Check
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                weight="bold"
              />
            )}
          </Button>
        }
      />
      <TooltipContent>
        {isFailed ? "Auto-tagging failed" : "Auto-tagging results"}
      </TooltipContent>
    </Tooltip>
  );
}

function JobDetailsSheet({
  job,
  isFailed,
  showSheet,
  onOpenChange,
  onDismiss,
}: {
  job: AutoTagJob;
  isFailed: boolean;
  showSheet: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={showSheet}>
      <SheetContent className="sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isFailed ? (
              <Warning className="h-4 w-4 text-destructive" weight="bold" />
            ) : (
              <Sparkle className="h-4 w-4" />
            )}
            Auto-tagging results
          </SheetTitle>
          <SheetDescription>
            {isFailed
              ? "The auto-tagging job encountered errors."
              : "Summary of the auto-tagging job."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Successfully tagged</span>
              <span className="font-medium">{job.successfulItems}</span>
            </div>
            {job.failedItems > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-medium text-destructive">
                  {job.failedItems}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{job.totalItems}</span>
            </div>
          </div>

          {job.errors.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="font-medium text-sm">Errors</h4>
              <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-xs">
                {job.errors.map((err) => (
                  <div
                    className="flex items-start gap-2 text-muted-foreground"
                    key={err.feedbackId}
                  >
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                    <span>{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="mt-2"
            onClick={() => {
              onOpenChange(false);
              onDismiss();
            }}
            size="sm"
            variant="outline"
          >
            Dismiss
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AutoTagButton({ organizationId }: AutoTagButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const prevJobStatusRef = useRef<string | null>(null);

  const untaggedCount = useQuery(
    api.feedback_auto_tagging.getUntaggedFeedbackCount,
    { organizationId }
  );

  const job = useQuery(api.feedback_auto_tagging.getActiveJob, {
    organizationId,
  });

  const startBulkAutoTagging = useMutation(
    api.feedback_auto_tagging.startBulkAutoTagging
  );

  const dismissJob = useMutation(api.feedback_auto_tagging.dismissJob);

  // Fire toast notifications on status transitions
  const jobStatus = job?.status ?? null;
  const jobSuccessful = job?.successfulItems ?? 0;
  const jobFailed = job?.failedItems ?? 0;

  useEffect(() => {
    const prevStatus = prevJobStatusRef.current;

    if (prevStatus === jobStatus) {
      return;
    }

    const wasActive = prevStatus === "pending" || prevStatus === "processing";

    // Transition to completed
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

    // Transition to failed
    if (jobStatus === "failed" && wasActive) {
      toast.error("Auto-tagging failed", {
        description: `${jobSuccessful} tagged, ${jobFailed} failed`,
      });
    }

    prevJobStatusRef.current = jobStatus;
  }, [jobStatus, jobSuccessful, jobFailed]);

  const handleStartAutoTag = async () => {
    setShowConfirmDialog(false);
    try {
      await startBulkAutoTagging({ organizationId });
    } catch (error) {
      toast.error("Failed to start auto-tagging", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleDismiss = async () => {
    if (!job) {
      return;
    }
    try {
      await dismissJob({ jobId: job._id });
    } catch {
      // Ignore dismiss errors
    }
  };

  // Show job status if there's an active or recently completed job
  if (job) {
    const isProcessing =
      job.status === "pending" || job.status === "processing";
    const isCompleted = job.status === "completed";
    const isFailed = job.status === "failed";
    const processed = Math.min(job.processedItems, job.totalItems);

    if (isProcessing) {
      return (
        <ProcessingJobButton processed={processed} total={job.totalItems} />
      );
    }

    if (isCompleted || isFailed) {
      return (
        <>
          <CompletedJobButton
            isFailed={isFailed}
            onShowDetails={() => setShowDetailsSheet(true)}
          />
          <JobDetailsSheet
            isFailed={isFailed}
            job={job}
            onDismiss={handleDismiss}
            onOpenChange={setShowDetailsSheet}
            showSheet={showDetailsSheet}
          />
        </>
      );
    }
  }

  // Don't show button if no untagged items or still loading
  if (untaggedCount === undefined || untaggedCount === 0) {
    return null;
  }

  return (
    <AlertDialog onOpenChange={setShowConfirmDialog} open={showConfirmDialog}>
      <AlertDialogTrigger
        render={
          <Button className="shrink-0 gap-1.5" size="sm" variant="outline">
            <Sparkle className="h-4 w-4" />
            <span>Auto-tag {untaggedCount}</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Auto-tag feedback items?</AlertDialogTitle>
          <AlertDialogDescription>
            AI will analyze {untaggedCount} untagged feedback{" "}
            {untaggedCount === 1 ? "item" : "items"} and assign appropriate
            tags, priority levels, complexity estimates, and time estimates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleStartAutoTag}>
            <Sparkle className="mr-2 h-4 w-4" />
            Start Auto-tagging
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
