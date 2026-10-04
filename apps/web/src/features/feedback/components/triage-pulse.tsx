"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
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
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowsClockwise,
  CheckCircle,
  DotsThree,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { ResultsPopover } from "./triage-results-popover";

interface TriagePulseProps {
  organizationId: Id<"organizations">;
}

const MANY_UNTAGGED_THRESHOLD = 5;

function PulsingDot({ pulse }: { pulse: boolean }) {
  return (
    <span aria-hidden className="relative flex size-2 shrink-0">
      {pulse && (
        <span className="absolute inline-flex size-full rounded-full bg-warning opacity-40 motion-safe:animate-ping" />
      )}
      <span className="relative inline-flex size-2 rounded-full bg-warning" />
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
  return (
    <Progress
      aria-label="AI auto-tagging progress"
      className="w-auto shrink-0 flex-row items-center gap-2 px-2"
      max={total}
      value={processed}
    >
      <span className="text-xs tabular-nums">
        {processed}
        <span className="text-muted-foreground">/{total} triaged</span>
      </span>

      {failed > 0 && (
        <span className="text-warning-text text-xs tabular-nums">
          {failed} failed
        </span>
      )}

      <ProgressTrack className="w-12">
        <ProgressIndicator className={cn(failed > 0 && "bg-warning")} />
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
              <DotsThree aria-hidden className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
            <ArrowsClockwise aria-hidden className="size-4" />
            <span className="tabular-nums">Recompute all ({total})</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DestructiveConfirmDialog
        confirmLabel="Recompute all"
        description={`This re-runs JEV triage on all ${total} feedback items. Each item costs a model call, and existing AI tags can be overwritten.`}
        onConfirm={onRecompute}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        title="Recompute triage for everything?"
      />
    </>
  );
}

export function TriagePulse({ organizationId }: TriagePulseProps) {
  const prevJobStatusRef = useRef<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

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

    if (jobStatus === "completed" && wasActive && jobFailed > 0) {
      toast.warning("Triage completed with errors", {
        description: `${jobSuccessful} analysed, ${jobFailed} failed`,
      });
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
    setIsStarting(true);
    try {
      await startBulkAutoTagging({ organizationId, scope });
    } catch (error) {
      toast.error("Couldn’t start triage", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
    setIsStarting(false);
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

  if (triageCounts === undefined) {
    return <Skeleton className="h-control-xs w-28 shrink-0" />;
  }

  const untriagedCount = triageCounts.untriaged;
  const totalCount = triageCounts.all;

  const recomputeMenu =
    totalCount > 0 ? (
      <RecomputeAllMenu
        onRecompute={() => startTriage("all")}
        total={totalCount}
      />
    ) : null;

  if (untriagedCount === 0) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <p className="flex items-center gap-1.5 px-2 text-muted-foreground text-xs">
          <CheckCircle aria-hidden className="size-3.5 text-success-text" />
          All caught up
        </p>
        {recomputeMenu}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        disabled={isStarting}
        onClick={() => startTriage("untriaged")}
        size="xs"
        variant="surface"
      >
        <PulsingDot pulse={untriagedCount >= MANY_UNTAGGED_THRESHOLD} />
        <Sparkle aria-hidden className="size-3.5" />
        <span className="tabular-nums">
          {isStarting ? "Starting…" : `${untriagedCount} to triage`}
        </span>
      </Button>
      {recomputeMenu}
    </div>
  );
}
