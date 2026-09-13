"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface UseCreateGithubIssueArgs {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations"> | undefined;
}

export function useCreateGithubIssue({
  feedbackId,
  organizationId,
}: UseCreateGithubIssueArgs) {
  const connection = useQuery(
    api.integrations.github.queries.getConnectionStatus,
    organizationId ? { organizationId } : "skip"
  );
  const createIssue = useAction(
    api.integrations.github.client_actions.createIssueFromFeedback
  );
  const [isCreatingGithubIssue, setIsCreatingGithubIssue] = useState(false);

  const createGithubIssue = useCallback(async () => {
    setIsCreatingGithubIssue(true);
    try {
      const issue = await createIssue({ feedbackId });
      toast.success(`GitHub issue #${issue.issueNumber} created`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create GitHub issue"
      );
    } finally {
      setIsCreatingGithubIssue(false);
    }
  }, [createIssue, feedbackId]);

  return {
    isCreatingGithubIssue,
    onCreateGithubIssue: connection?.hasRepository
      ? createGithubIssue
      : undefined,
  };
}
