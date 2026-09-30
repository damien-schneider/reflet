"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { CompletionSummary } from "./retroactive-completion";
import { type GroupingStrategy, isActiveStatus } from "./retroactive-constants";
import { ProgressView } from "./retroactive-progress-view";
import { TriggerView } from "./retroactive-trigger-view";

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
  const [isCancelling, setIsCancelling] = useState(false);

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
    job !== null && job !== undefined && isActiveStatus(job.status);

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
        groupingStrategy,
        organizationId,
        skipExistingVersions: skipExisting,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn’t start generation. Try again.";
      toast.error(message);
    }
    setIsStarting(false);
  };

  const handleCancel = async () => {
    if (!job?._id) {
      return;
    }
    setIsCancelling(true);
    try {
      await cancelJob({ jobId: job._id });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn’t cancel. Try again.";
      toast.error(message);
    }
    setIsCancelling(false);
  };

  if (isJobActive) {
    return (
      <ProgressView
        isCancelling={isCancelling}
        job={job}
        onCancel={handleCancel}
      />
    );
  }

  if (job?.status === "completed") {
    return <CompletionSummary job={job} onDismiss={() => setDismissed(true)} />;
  }

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
