"use client";

import {
  CaretDown,
  Check,
  ClockCounterClockwise,
  GithubLogo,
  Lightning,
  Spinner,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type GroupingStrategy = "auto" | "tags" | "monthly";

const ACTIVE_STATUSES = [
  "pending",
  "fetching_tags",
  "fetching_commits",
  "generating",
  "creating_releases",
] as const;

const PHASE_STEPS = [
  { key: "fetching_tags", label: "Fetching tags" },
  { key: "fetching_commits", label: "Fetching commits" },
  { key: "generating", label: "Generating notes" },
  { key: "creating_releases", label: "Creating releases" },
] as const;

const GROUPING_OPTIONS = [
  { value: "auto" as const, label: "Auto" },
  { value: "tags" as const, label: "Tags" },
  { value: "monthly" as const, label: "Monthly" },
];

const SUCCESS_DISPLAY_DURATION = 4000;

interface RetroactiveInlineFlowProps {
  organizationId: Id<"organizations">;
}

export function RetroactiveInlineFlow({
  organizationId,
}: RetroactiveInlineFlowProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [groupingStrategy, setGroupingStrategy] =
    useState<GroupingStrategy>("auto");
  const [skipExisting, setSkipExisting] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const job = useQuery(api.changelog.retroactive.getRetroactiveJob, {
    organizationId,
  });

  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );

  const startRetroactive = useMutation(
    api.changelog.retroactive.startRetroactiveChangelog
  );

  const cancelJob = useMutation(
    api.changelog.retroactive.cancelRetroactiveChangelog
  );

  const isJobActive =
    job !== null &&
    job !== undefined &&
    ACTIVE_STATUSES.includes(job.status as (typeof ACTIVE_STATUSES)[number]);

  const isJobTerminal =
    job?.status === "completed" ||
    job?.status === "error" ||
    job?.status === "cancelled";

  // Show success briefly when job completes
  useEffect(() => {
    if (job?.status === "completed" && !showSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(
        () => setShowSuccess(false),
        SUCCESS_DISPLAY_DURATION
      );
      return () => clearTimeout(timer);
    }
  }, [job?.status, showSuccess]);

  const repoName = githubConnection?.repositoryFullName;
  const isConnected = Boolean(repoName);

  if (!isConnected || dismissed) {
    return null;
  }

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startRetroactive({
        organizationId,
        groupingStrategy,
        skipExistingVersions: skipExisting,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start changelog generation";
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!job?._id) {
      return;
    }
    try {
      await cancelJob({ jobId: job._id });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel";
      toast.error(message);
    }
  };

  // Running state
  if (isJobActive) {
    return <ProgressView job={job} onCancel={handleCancel} />;
  }

  // Brief success flash
  if (showSuccess && job?.status === "completed") {
    const createdCount =
      job.groups?.filter(
        (g) => g.status === "created" || g.status === "generated"
      ).length ?? 0;

    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <span className="font-medium text-sm">
          {createdCount} draft release{createdCount === 1 ? "" : "s"} created
        </span>
      </div>
    );
  }

  // Error state (show trigger again with error context)
  if (job?.status === "error") {
    return (
      <TriggerView
        error={job.error}
        groupingStrategy={groupingStrategy}
        isStarting={isStarting}
        onDismiss={() => setDismissed(true)}
        onStart={handleStart}
        repoName={repoName}
        setGroupingStrategy={setGroupingStrategy}
        setSkipExisting={setSkipExisting}
        skipExisting={skipExisting}
      />
    );
  }

  // Trigger state (no job or terminal job)
  if (!job || isJobTerminal) {
    return (
      <TriggerView
        groupingStrategy={groupingStrategy}
        isStarting={isStarting}
        onDismiss={() => setDismissed(true)}
        onStart={handleStart}
        repoName={repoName}
        setGroupingStrategy={setGroupingStrategy}
        setSkipExisting={setSkipExisting}
        skipExisting={skipExisting}
      />
    );
  }

  return null;
}

// --- Trigger View ---

interface TriggerViewProps {
  error?: string;
  groupingStrategy: GroupingStrategy;
  isStarting: boolean;
  onDismiss: () => void;
  onStart: () => void;
  repoName?: string;
  setGroupingStrategy: (strategy: GroupingStrategy) => void;
  setSkipExisting: (skip: boolean) => void;
  skipExisting: boolean;
}

function TriggerView({
  repoName,
  error,
  isStarting,
  onStart,
  onDismiss,
  groupingStrategy,
  setGroupingStrategy,
  skipExisting,
  setSkipExisting,
}: TriggerViewProps) {
  return (
    <div className="relative mb-6 rounded-xl border-2 border-muted-foreground/20 border-dashed p-8">
      <button
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ClockCounterClockwise className="h-6 w-6 text-primary" />
        </div>

        <div>
          <h3 className="font-semibold text-lg">Generate your changelog</h3>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
            Import past releases from your git history. We&apos;ll create draft
            entries you can review before publishing.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {repoName && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <GithubLogo className="h-4 w-4" />
            <span>{repoName}</span>
          </div>
        )}

        <Button disabled={isStarting} onClick={onStart} size="lg" type="button">
          {isStarting ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Lightning className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>

        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground">
            Options
            <CaretDown className="h-3 w-3 transition-transform group-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 flex w-full max-w-sm flex-col gap-3 text-left">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">
                  Group by
                </Label>
                <div className="inline-flex rounded-md border">
                  {GROUPING_OPTIONS.map((option) => (
                    <button
                      className={cn(
                        "px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                        groupingStrategy === option.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      key={option.value}
                      onClick={() => setGroupingStrategy(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={skipExisting}
                  id="inline-skip-existing"
                  onCheckedChange={(checked) =>
                    setSkipExisting(Boolean(checked))
                  }
                />
                <Label
                  className="cursor-pointer text-xs"
                  htmlFor="inline-skip-existing"
                >
                  Skip existing versions
                </Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

// --- Progress View ---

interface ProgressViewProps {
  job: {
    _id: Id<"retroactiveJobs">;
    currentStep?: string;
    groups?: Array<{
      id: string;
      status: string;
      title: string;
    }>;
    status: string;
    totalGroups?: number;
  };
  onCancel: () => void;
}

function ProgressView({ job, onCancel }: ProgressViewProps) {
  const processedGroups =
    job.groups?.filter(
      (g) => g.status === "generated" || g.status === "created"
    ).length ?? 0;
  const totalGroups = job.totalGroups ?? 0;
  const progressPercent =
    totalGroups > 0 ? Math.round((processedGroups / totalGroups) * 100) : 0;

  const currentPhaseIndex = PHASE_STEPS.findIndex((s) =>
    job.status === "creating_releases"
      ? s.key === "creating_releases"
      : s.key === job.status
  );

  return (
    <div className="mb-6 rounded-xl border p-5">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5 animate-spin text-primary" />
            <div>
              <h3 className="font-medium text-sm">Generating changelog...</h3>
              <p className="text-muted-foreground text-xs">
                {job.currentStep ?? "Processing..."}
              </p>
            </div>
          </div>
          <button
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {totalGroups > 0 && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {processedGroups} / {totalGroups} releases
            </span>
          )}
        </div>

        {/* Phase steps */}
        <div className="flex items-center gap-1">
          {PHASE_STEPS.map((step, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isActive = index === currentPhaseIndex;

            return (
              <div className="flex items-center gap-1" key={step.key}>
                <div
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    isCompleted && "bg-green-500",
                    isActive && "bg-primary",
                    !(isCompleted || isActive) && "bg-muted-foreground/20"
                  )}
                  title={step.label}
                />
                {index < PHASE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-4",
                      isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
