"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CompletionSummary } from "@/features/changelog/components/retroactive-completion-summary";
import type { GroupingStrategy } from "@/features/changelog/components/retroactive-constants";
import { ACTIVE_STATUSES } from "@/features/changelog/components/retroactive-constants";
import { ProgressView } from "@/features/changelog/components/retroactive-progress-view";
import { TriggerView } from "@/features/changelog/components/retroactive-trigger-view";

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
