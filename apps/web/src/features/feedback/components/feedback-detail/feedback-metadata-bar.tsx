"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import type { FeedbackDetail } from "@/features/feedback/components/properties/property-types";
import { PublicationProperty } from "@/features/feedback/components/properties/publication-property";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AiAnalysisDisplay } from "./ai-analysis-display";
import { AssigneeDisplay } from "./assignee-display";
import { CopyForAgents } from "./copy-for-agents";
import { DeadlineDisplay } from "./deadline-display";
import { StatusDisplay } from "./status-display";
import { SubscribeButton } from "./subscribe-button";
import { TagDisplay } from "./tag-display";
import { VoteButtons } from "./vote-buttons";

export function FeedbackMetadataBar({
  feedback,
  isAdmin,
}: {
  feedback: FeedbackDetail;
  isAdmin: boolean;
}) {
  const {
    _id: feedbackId,
    organizationId,
    organizationStatusId,
    assignee,
    tags: feedbackTags,
    title,
    description,
    attachments,
    deadline,
    voteCount,
    userVoteType,
  } = feedback;
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  const organizationStatuses = useQuery(api.organizations.statuses.list, {
    organizationId,
  });
  const members = useQuery(
    api.organizations.members.list,
    isAdmin ? { organizationId } : "skip"
  );
  const availableTags = useQuery(
    api.feedback.tags.list,
    isAdmin ? { organizationId } : "skip"
  );
  const isSubscribed = useQuery(api.feedback.subscriptions.isSubscribed, {
    feedbackId,
  });

  const toggleVote = useMutation(api.feedback.votes.toggle);
  const updateStatus = useMutation(
    api.feedback.triage_actions.updateOrganizationStatus
  );
  const assignFeedback = useMutation(api.feedback.triage_actions.assign);
  const toggleSubscription = useMutation(api.feedback.subscriptions.toggle);
  const updateAnalysis = useMutation(
    api.feedback.triage_actions.updateAnalysis
  );
  const addTagMutation = useMutation(api.feedback.tag_mutations.addToFeedback);
  const removeTagMutation = useMutation(
    api.feedback.tag_mutations.removeFromFeedback
  );

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === organizationStatusId
  );

  const validTags = (feedbackTags ?? []).filter(
    (t): t is NonNullable<typeof t> => t !== null
  );
  const feedbackTagIds = new Set(validTags.map((t) => t._id));

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleVote({ feedbackId, voteType });
  };

  const handleStatusChange = async (
    statusId: Id<"organizationStatuses"> | null
  ) => {
    if (statusId) {
      await updateStatus({
        feedbackId,
        organizationStatusId: statusId,
      });
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    await assignFeedback({
      assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
      feedbackId,
    });
  };

  const handleToggleTag = async (
    tagId: Id<"tags">,
    isCurrentlyApplied: boolean
  ) => {
    if (isCurrentlyApplied) {
      await removeTagMutation({ feedbackId, tagId });
    } else {
      await addTagMutation({ feedbackId, tagId });
    }
  };

  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const handleDeadlineChange = async (date: Date) => {
    await updateAnalysis({ deadline: date.getTime(), feedbackId });
    setDeadlineOpen(false);
  };

  const handleDeadlineClear = async () => {
    await updateAnalysis({ clearDeadline: true, feedbackId });
    setDeadlineOpen(false);
  };

  const handleToggleSubscription = async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleSubscription({ feedbackId });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
      <VoteButtons
        onVote={handleVote}
        userVoteType={userVoteType}
        voteCount={voteCount}
      />

      {feedback.isMember && (
        <PublicationProperty
          editable={isAdmin}
          feedbackId={feedbackId}
          publication={{
            ...feedback,
            organizationIsPublic: feedback.organization.isPublic,
          }}
        />
      )}

      <StatusDisplay
        currentStatus={currentStatus}
        isAdmin={feedback.isMember}
        onStatusChange={handleStatusChange}
        organizationStatuses={organizationStatuses}
        statusId={organizationStatusId}
      />

      <TagDisplay
        availableTags={availableTags}
        feedbackTagIds={feedbackTagIds}
        isAdmin={isAdmin}
        onToggleTag={handleToggleTag}
        validTags={validTags}
      />

      {feedback.isMember && (
        <AiAnalysisDisplay
          {...feedback}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
        />
      )}

      {isAdmin && (
        <DeadlineDisplay
          deadline={deadline}
          isOpen={deadlineOpen}
          onChange={handleDeadlineChange}
          onClear={handleDeadlineClear}
          onOpenChange={setDeadlineOpen}
        />
      )}

      <AssigneeDisplay
        assignee={assignee}
        isAdmin={isAdmin}
        members={members}
        onAssigneeChange={handleAssigneeChange}
      />

      <div className="flex-1" />

      {isAdmin && (
        <CopyForAgents
          attachments={attachments}
          description={description}
          feedbackId={feedbackId}
          organizationId={organizationId}
          tags={feedbackTags}
          title={title}
        />
      )}

      <SubscribeButton
        isSubscribed={isSubscribed}
        onToggle={handleToggleSubscription}
      />
    </div>
  );
}
