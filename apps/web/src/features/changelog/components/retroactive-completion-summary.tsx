import { Check, Warning, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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

export function CompletionSummary({ job, onDismiss }: CompletionSummaryProps) {
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
