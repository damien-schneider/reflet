"use client";

import { Check, Spinner, WarningCircle, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASE_STEPS = [
  { key: "fetching_tags", label: "Fetching tags" },
  { key: "fetching_commits", label: "Fetching commits" },
  { key: "generating", label: "Generating notes" },
  { key: "creating", label: "Creating releases" },
] as const;

interface RetroactiveScanProgressProps {
  onCancel: () => void;
  onComplete: () => void;
  organizationId: Id<"organizations">;
}

export function RetroactiveScanProgress({
  organizationId,
  onComplete,
  onCancel,
}: RetroactiveScanProgressProps) {
  const job = useQuery(api.changelog.retroactive.getRetroactiveJob, {
    organizationId,
  });

  const cancelJob = useMutation(
    api.changelog.retroactive.cancelRetroactiveChangelog
  );

  const isTerminal = job?.status === "completed" || job?.status === "error";

  useEffect(() => {
    if (isTerminal) {
      onComplete();
    }
  }, [isTerminal, onComplete]);

  const handleCancel = async () => {
    if (!job?._id) {
      return;
    }
    try {
      await cancelJob({ jobId: job._id });
      onCancel();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel scan";
      toast.error(message);
    }
  };

  if (!job) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const processedGroups =
    job.groups?.filter(
      (g) => g.status === "generated" || g.status === "created"
    ).length ?? 0;
  const totalGroups = job.totalGroups ?? 0;
  const progressPercent =
    totalGroups > 0 ? Math.round((processedGroups / totalGroups) * 100) : 0;

  const currentPhaseIndex = PHASE_STEPS.findIndex((s) =>
    job.status === "creating_releases"
      ? s.key === "creating"
      : s.key === job.status
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {job.currentStep ?? "Processing..."}
          </span>
          <span className="font-medium tabular-nums">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Phase indicators */}
      <div className="flex flex-col gap-1">
        {PHASE_STEPS.map((step, index) => {
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive && "bg-primary/5 font-medium text-foreground",
                isCompleted && "text-muted-foreground",
                isPending && "text-muted-foreground/50"
              )}
              key={step.key}
            >
              {isCompleted && (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {isActive && (
                <Spinner className="h-4 w-4 shrink-0 animate-spin text-primary" />
              )}
              {isPending && (
                <div className="h-4 w-4 shrink-0 rounded-full border border-current opacity-30" />
              )}
              {step.label}
            </div>
          );
        })}
      </div>

      {/* Completed groups */}
      {job.groups && job.groups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Processed ({processedGroups}/{totalGroups})
          </span>
          <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {job.groups
              .filter((g) => g.status === "generated" || g.status === "created")
              .map((group) => (
                <div
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm"
                  key={group.id}
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span className="truncate">{group.title}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {job.status === "error" && job.error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <WarningCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-destructive text-sm">{job.error}</span>
        </div>
      )}

      {/* Cancel button */}
      {!isTerminal && (
        <Button
          className="w-full"
          onClick={handleCancel}
          type="button"
          variant="outline"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  );
}
