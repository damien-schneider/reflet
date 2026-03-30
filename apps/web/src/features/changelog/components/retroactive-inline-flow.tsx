"use client";

import {
  CaretDown,
  Check,
  ClockCounterClockwise,
  GithubLogo,
  Lightning,
  Spinner,
  Warning,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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

type GroupingStrategy = "auto" | "tags" | "weekly";

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
  { value: "weekly" as const, label: "Weekly" },
];

interface RetroactiveInlineFlowProps {
  organizationId: Id<"organizations">;
}

export function RetroactiveInlineFlow({
  organizationId,
}: RetroactiveInlineFlowProps) {
  const [dismissed, setDismissed] = useState(false);
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

  // Completed state — show summary
  if (job?.status === "completed") {
    return <CompletionSummary job={job} onDismiss={() => setDismissed(true)} />;
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

interface JobData {
  _id: Id<"retroactiveJobs">;
  currentStep?: string;
  fetchedCommits?: number;
  groups?: Array<{
    commitCount: number;
    error?: string;
    id: string;
    status: string;
    title: string;
  }>;
  status: string;
  totalGroups?: number;
  totalTags?: number;
}

interface ProgressViewProps {
  job: JobData;
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

        {/* Live stats */}
        <div className="flex flex-wrap gap-4">
          {job.totalTags !== undefined && (
            <StatBadge label="Tags" value={job.totalTags} />
          )}
          {job.fetchedCommits !== undefined && job.fetchedCommits > 0 && (
            <StatBadge label="Commits" value={job.fetchedCommits} />
          )}
          {totalGroups > 0 && (
            <StatBadge
              label="Groups"
              value={`${processedGroups}/${totalGroups}`}
            />
          )}
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

        {/* Group details (collapsible) */}
        {job.groups && job.groups.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground">
              View groups
              <CaretDown className="h-3 w-3 transition-transform group-data-panel-open:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {job.groups.map((group) => (
                  <div
                    className="flex items-center justify-between rounded px-2 py-1 text-xs"
                    key={group.id}
                  >
                    <span className="truncate text-foreground">
                      {group.title}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">
                        {group.commitCount} commits
                      </span>
                      <GroupStatusDot status={group.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

// --- Completion Summary ---

interface CompletionJobData {
  error?: string;
  fetchedCommits?: number;
  groups?: Array<{
    commitCount: number;
    status: string;
    title: string;
  }>;
  skipExistingVersions?: boolean;
  totalGroups?: number;
  totalTags?: number;
}

interface CompletionSummaryProps {
  job: CompletionJobData;
  onDismiss: () => void;
}

function getEmptyResultHint(
  job: CompletionJobData,
  totalGroups: number
): string {
  if ((job.fetchedCommits ?? 0) === 0) {
    return "No commits were found on the target branch. Check that your repository has commits and the correct branch is configured.";
  }
  if (totalGroups === 0 && job.skipExistingVersions) {
    return 'Commits were found but no groups could be formed. All versions may already exist — try unchecking "Skip existing versions" in the options.';
  }
  if (totalGroups === 0) {
    return "Commits were found but no groups could be formed. Try a different grouping strategy.";
  }
  return "Groups were formed but no releases could be created. This may be due to AI generation errors. Try running again.";
}

function CompletionSummary({ job, onDismiss }: CompletionSummaryProps) {
  const createdCount =
    job.groups?.filter(
      (g) => g.status === "created" || g.status === "generated"
    ).length ?? 0;
  const skippedCount =
    job.groups?.filter((g) => g.status === "skipped").length ?? 0;
  const errorCount =
    job.groups?.filter((g) => g.status === "error").length ?? 0;
  const totalGroups = job.totalGroups ?? job.groups?.length ?? 0;
  const hasResults = createdCount > 0;

  return (
    <div
      className={cn(
        "relative mb-6 rounded-xl border p-5",
        hasResults
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      )}
    >
      <button
        aria-label="Dismiss"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <CompletionIcon hasResults={hasResults} />

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm">
            {hasResults
              ? `${createdCount} draft release${createdCount === 1 ? "" : "s"} generated`
              : "No draft releases generated"}
          </h3>

          <CompletionStats
            createdCount={createdCount}
            errorCount={errorCount}
            fetchedCommits={job.fetchedCommits}
            skippedCount={skippedCount}
            totalGroups={totalGroups}
            totalTags={job.totalTags}
          />

          {!hasResults && (
            <div className="mt-3 rounded-md bg-background/50 px-3 py-2 text-muted-foreground text-xs">
              <p>{getEmptyResultHint(job, totalGroups)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletionIcon({ hasResults }: { hasResults: boolean }) {
  if (hasResults) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
      <Warning className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    </div>
  );
}

function CompletionStats({
  totalTags,
  fetchedCommits,
  totalGroups,
  createdCount,
  skippedCount,
  errorCount,
}: {
  createdCount: number;
  errorCount: number;
  fetchedCommits?: number;
  skippedCount: number;
  totalGroups: number;
  totalTags?: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
      {totalTags !== undefined && (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {totalTags}
          </span>{" "}
          tags found
        </span>
      )}
      {fetchedCommits !== undefined && (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {fetchedCommits}
          </span>{" "}
          commits analyzed
        </span>
      )}
      {totalGroups > 0 && (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {totalGroups}
          </span>{" "}
          groups formed
        </span>
      )}
      {createdCount > 0 && (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {createdCount}
          </span>{" "}
          releases created
        </span>
      )}
      {skippedCount > 0 && (
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {skippedCount}
          </span>{" "}
          skipped
        </span>
      )}
      {errorCount > 0 && (
        <span className="text-destructive">
          <span className="font-medium tabular-nums">{errorCount}</span> errors
        </span>
      )}
    </div>
  );
}

// --- Shared components ---

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1">
      <span className="font-medium text-foreground text-xs tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function GroupStatusDot({ status }: { status: string }) {
  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full",
        status === "created" && "bg-green-500",
        status === "generated" && "bg-green-500",
        status === "generating" && "animate-pulse bg-primary",
        status === "pending" && "bg-muted-foreground/30",
        status === "skipped" && "bg-muted-foreground/30",
        status === "error" && "bg-destructive"
      )}
      title={status}
    />
  );
}
