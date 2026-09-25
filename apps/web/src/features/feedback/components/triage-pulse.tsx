"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@ctrl-ui/react/ui/progress";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowsClockwise, DotsThree, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
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
    <Progress
      aria-label="AI auto-tagging progress"
      className="w-auto shrink-0 flex-row items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5"
      max={total}
      value={processed}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 -rotate-90"
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
          className="stroke-current text-primary transition-[stroke-dasharray] duration-500 ease-out"
          cx="8"
          cy="8"
          fill="none"
          r="6"
          strokeDasharray={`${percentage * 0.377} 37.7`}
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>

      <div className="flex items-baseline gap-1">
        <span className="font-medium text-xs tabular-nums">
          {processed}
          <span className="text-muted-foreground">/{total}</span>
        </span>
        <span className="text-caption text-muted-foreground">triaged</span>
      </div>

      {failed > 0 && (
        <span className="text-caption text-warning-text tabular-nums">
          {failed} failed
        </span>
      )}

      <ProgressTrack className="h-1 w-12 rounded-full bg-muted">
        <ProgressIndicator
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
            failed > 0 ? "bg-warning" : "bg-primary"
          )}
        />
      </ProgressTrack>
    </Progress>
  );
}

function RecomputeAllMenu({
  onRecompute,
  total,
}: {
  onRecompute: () => void;
  total: number;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Triage options"
              iconOnly
              size="xs"
              variant="ghost"
            >
              <DotsThree className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
            <ArrowsClockwise className="mr-2 h-4 w-4" />
            Recompute all ({total})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setIsConfirmOpen} open={isConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recompute all triage</AlertDialogTitle>
            <AlertDialogDescription>
              This re-runs JEV triage on all {total} feedback items. Each item
              costs a model call, and existing AI tags can be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={onRecompute}
              tone="danger"
              variant="surface"
            >
              Recompute all
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TriagePulse({ organizationId }: TriagePulseProps) {
  const prevJobStatusRef = useRef<string | null>(null);

  const triageCounts = useQuery(api.feedback.auto_tagging.getTriageCounts, {
    organizationId,
  });

  const job = useQuery(api.feedback.auto_tagging.getActiveJob, {
    organizationId,
  });

  const startBulkAutoTagging = useMutation(
    api.feedback.auto_tagging_jobs.startBulkAutoTagging
  );
  const dismissJob = useMutation(api.feedback.auto_tagging_jobs.dismissJob);

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
        toast.warning("Triage completed with errors", {
          description: `${jobSuccessful} analysed, ${jobFailed} failed`,
        });
      } else {
        toast.success("Triage complete", {
          description: `${jobSuccessful} items analysed`,
        });
      }
    }

    if (jobStatus === "failed" && wasActive) {
      toast.error("Triage failed", {
        description: `${jobSuccessful} analysed, ${jobFailed} failed`,
      });
    }

    prevJobStatusRef.current = jobStatus;
  }, [jobStatus, jobSuccessful, jobFailed]);

  const isProcessing =
    job?.status === "pending" || job?.status === "processing";
  const isCompleted = job?.status === "completed" || job?.status === "failed";

  const startTriage = async (scope: "untriaged" | "all") => {
    try {
      await startBulkAutoTagging({ organizationId, scope });
    } catch (error) {
      toast.error("Failed to start triage", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

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
      dismissJob({ jobId: job._id }).catch(() => undefined);
    }
  };

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

  const untriagedCount = triageCounts?.untriaged ?? 0;
  const totalCount = triageCounts?.all ?? 0;
  const allTriaged = untriagedCount === 0;
  const manyUntriaged = untriagedCount >= MANY_UNTAGGED_THRESHOLD;

  let dotColor = "bg-warning";
  if (allTriaged) {
    dotColor = "bg-success";
  } else if (manyUntriaged) {
    dotColor = "bg-destructive";
  }

  const recomputeMenu =
    totalCount > 0 ? (
      <RecomputeAllMenu
        onRecompute={() => startTriage("all")}
        total={totalCount}
      />
    ) : null;

  if (allTriaged) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <div className="flex items-center gap-1.5 px-2 text-muted-foreground text-xs">
          <span className={cn("h-2 w-2 rounded-full", dotColor)} />
          <span>All caught up</span>
        </div>
        {recomputeMenu}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        className="gap-1.5"
        onClick={() => startTriage("untriaged")}
        size="xs"
        variant="surface"
      >
        <PulsingDot color={dotColor} />
        <Sparkle className="h-3.5 w-3.5" />
        <span className="tabular-nums">{untriagedCount} to triage</span>
      </Button>
      {recomputeMenu}
    </div>
  );
}
