"use client";

import {
  ArrowsClockwise,
  Check,
  Sparkle,
  Warning,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AutoTagButtonProps {
  organizationId: Id<"organizations">;
}

export function AutoTagButton({ organizationId }: AutoTagButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
    if (job) {
      try {
        await dismissJob({ jobId: job._id });
      } catch {
        // Ignore dismiss errors
      }
    }
  };

  // Show job status if there's an active or recently completed job
  if (job) {
    const isProcessing =
      job.status === "pending" || job.status === "processing";
    const isCompleted = job.status === "completed";
    const isFailed = job.status === "failed";

    // Defensive: ensure processed never exceeds total
    const processed = Math.min(job.processedItems, job.totalItems);
    const progress =
      job.totalItems > 0 ? Math.round((processed / job.totalItems) * 100) : 0;

    if (isProcessing) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm dark:border-blue-900 dark:bg-blue-950">
          <ArrowsClockwise className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Auto-tagging...
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {processed}/{job.totalItems}
              </span>
            </div>
            <Progress className="h-1 w-24" value={progress} />
          </div>
          <button
            className="ml-1 rounded p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
            onClick={handleDismiss}
            title="Cancel"
            type="button"
          >
            <X className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      );
    }

    if (isCompleted || isFailed) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
            isCompleted &&
              "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
            isFailed &&
              "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          )}
        >
          {isCompleted ? (
            <Check
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              weight="bold"
            />
          ) : (
            <Warning
              className="h-4 w-4 text-red-600 dark:text-red-400"
              weight="bold"
            />
          )}
          <span
            className={cn(
              "font-medium",
              isCompleted && "text-emerald-700 dark:text-emerald-300",
              isFailed && "text-red-700 dark:text-red-300"
            )}
          >
            {isCompleted ? "Done" : "Failed"}
          </span>
          <span
            className={cn(
              "text-xs",
              isCompleted && "text-emerald-600 dark:text-emerald-400",
              isFailed && "text-red-600 dark:text-red-400"
            )}
          >
            {job.successfulItems} tagged
            {job.failedItems > 0 && `, ${job.failedItems} failed`}
          </span>
          <button
            className={cn(
              "ml-1 rounded p-0.5",
              isCompleted && "hover:bg-emerald-200 dark:hover:bg-emerald-800",
              isFailed && "hover:bg-red-200 dark:hover:bg-red-800"
            )}
            onClick={handleDismiss}
            type="button"
          >
            <X
              className={cn(
                "h-3.5 w-3.5",
                isCompleted && "text-emerald-600 dark:text-emerald-400",
                isFailed && "text-red-600 dark:text-red-400"
              )}
            />
          </button>
        </div>
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
            {untaggedCount === 1 ? "item" : "items"} and assign appropriate tags
            from your existing tag list.
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
