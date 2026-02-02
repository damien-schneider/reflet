"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface UseFeedbackSidebarProps {
  feedbackId: Id<"feedback">;
  organizationId?: Id<"organizations">;
  isAdmin: boolean;
}

export function useFeedbackSidebar({
  feedbackId,
  organizationId,
  isAdmin,
}: UseFeedbackSidebarProps) {
  const organizationStatuses = useQuery(
    api.organization_statuses.list,
    organizationId ? { organizationId } : "skip"
  );

  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });

  const members = useQuery(
    api.members.list,
    isAdmin && organizationId ? { organizationId } : "skip"
  );

  const difficultyEstimate = useQuery(
    api.feedback_clarification.getDifficultyEstimate,
    isAdmin ? { feedbackId } : "skip"
  );

  const toggleVote = useMutation(api.votes.toggle);
  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);
  const assignFeedback = useMutation(api.feedback_actions.assign);
  const initiateDifficultyEstimate = useMutation(
    api.feedback_clarification.initiateDifficultyEstimate
  );

  const [isGeneratingDifficulty, setIsGeneratingDifficulty] = useState(false);

  const handleVote = useCallback(async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleStatusChange = useCallback(
    async (statusId: Id<"organizationStatuses"> | null) => {
      if (!statusId) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        organizationStatusId: statusId,
      });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleToggleSubscription = useCallback(async () => {
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription]);

  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      await assignFeedback({
        feedbackId,
        assigneeId:
          !assigneeId || assigneeId === "unassigned" ? undefined : assigneeId,
      });
    },
    [feedbackId, assignFeedback]
  );

  const handleGenerateDifficulty = useCallback(async () => {
    setIsGeneratingDifficulty(true);
    try {
      await initiateDifficultyEstimate({ feedbackId });
    } finally {
      setTimeout(() => setIsGeneratingDifficulty(false), 2000);
    }
  }, [feedbackId, initiateDifficultyEstimate]);

  return {
    organizationStatuses,
    isSubscribed,
    members,
    difficultyEstimate,
    isGeneratingDifficulty,
    handleVote,
    handleStatusChange,
    handleToggleSubscription,
    handleAssigneeChange,
    handleGenerateDifficulty,
  };
}
