import { CaretDown, Spinner } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PHASE_STEPS } from "@/features/changelog/components/retroactive-constants";
import { cn } from "@/lib/utils";

export interface JobData {
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

export function ProgressView({ job, onCancel }: ProgressViewProps) {
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
