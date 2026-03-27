"use client";

import { GithubLogo, Lightning, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type GroupingStrategy = "auto" | "tags" | "monthly";

interface RetroactiveScanConfigProps {
  disabled?: boolean;
  onStart: (jobId: Id<"retroactiveJobs">) => void;
  organizationId: Id<"organizations">;
}

const GROUPING_OPTIONS: Array<{
  description: string;
  label: string;
  value: GroupingStrategy;
}> = [
  {
    value: "auto",
    label: "Auto-detect",
    description: "Recommended. Detects tags, falls back to monthly.",
  },
  {
    value: "tags",
    label: "By tags",
    description: "Group commits using git tags as version boundaries.",
  },
  {
    value: "monthly",
    label: "By month",
    description: "Group commits by calendar month.",
  },
];

export function RetroactiveScanConfig({
  organizationId,
  onStart,
  disabled,
}: RetroactiveScanConfigProps) {
  const [groupingStrategy, setGroupingStrategy] =
    useState<GroupingStrategy>("auto");
  const [skipExisting, setSkipExisting] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );

  const startRetroactive = useMutation(
    api.changelog.retroactive.startRetroactiveChangelog
  );

  const repoName = githubConnection?.repositoryFullName;
  const isConnected = Boolean(repoName);

  const handleStart = async () => {
    if (!isConnected) {
      toast.error("No GitHub repository connected. Connect one first.");
      return;
    }

    setIsStarting(true);
    try {
      const jobId = await startRetroactive({
        organizationId,
        groupingStrategy,
        skipExistingVersions: skipExisting,
      });
      onStart(jobId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start retroactive scan";
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const isDisabled = disabled || isStarting || !isConnected;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-medium text-sm">Generate from History</h3>
        <p className="text-muted-foreground text-sm">
          Scan your repository's git history and automatically generate
          changelog entries for past releases. Drafts will be created for your
          review before publishing.
        </p>
      </div>

      {/* Connected repo */}
      {githubConnection !== undefined && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <GithubLogo className="h-4 w-4 shrink-0" />
          {repoName ? (
            <span className="truncate text-sm">{repoName}</span>
          ) : (
            <span className="text-muted-foreground text-sm">
              No repository connected
            </span>
          )}
        </div>
      )}

      {/* Grouping strategy */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Grouping strategy</Label>
        <div className="flex flex-col gap-1.5">
          {GROUPING_OPTIONS.map((option) => (
            <button
              className={cn(
                "flex flex-col gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                groupingStrategy === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
              )}
              key={option.value}
              onClick={() => setGroupingStrategy(option.value)}
              type="button"
            >
              <span className="font-medium text-sm">{option.label}</span>
              <span className="text-muted-foreground text-xs">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Skip existing */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={skipExisting}
          id="skip-existing"
          onCheckedChange={(checked) => setSkipExisting(Boolean(checked))}
        />
        <Label className="cursor-pointer text-sm" htmlFor="skip-existing">
          Skip versions that already have releases
        </Label>
      </div>

      {/* Start button */}
      <Button
        className="w-full"
        disabled={isDisabled}
        onClick={handleStart}
        type="button"
      >
        {isStarting ? (
          <>
            <Spinner className="h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Lightning className="h-4 w-4" />
            Start Scan
          </>
        )}
      </Button>
    </div>
  );
}
