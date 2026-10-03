"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  type FeedbackPropertiesLayout,
  PropertyRow,
} from "@/features/feedback/components/properties/presentation/property-row";
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
  layout = "bar",
}: {
  feedback: FeedbackDetail;
  isAdmin: boolean;
  layout?: FeedbackPropertiesLayout;
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

  const currentStatus = feedback.organizationStatus ?? undefined;

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
    <div
      className={cn(
        layout === "panel"
          ? "space-y-4 p-4"
          : "flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3"
      )}
    >
      {layout === "panel" && (
        <h2 className="font-medium text-body">Properties</h2>
      )}
      <div className={layout === "panel" ? "grid" : "contents"}>
        <PropertyRow label="Votes" layout={layout}>
          <VoteButtons
            onVote={handleVote}
            userVoteType={userVoteType}
            voteCount={voteCount}
          />
        </PropertyRow>

        {feedback.isMember && (
          <PropertyRow label="Publication" layout={layout}>
            <PublicationProperty
              editable={isAdmin}
              feedbackId={feedbackId}
              publication={{
                ...feedback,
                organizationIsPublic: feedback.organization.isPublic,
              }}
            />
          </PropertyRow>
        )}

        <PropertyRow label="Status" layout={layout}>
          <StatusDisplay
            currentStatus={currentStatus}
            isAdmin={feedback.isMember}
            onStatusChange={handleStatusChange}
            organizationStatuses={organizationStatuses}
            statusId={organizationStatusId}
          />
        </PropertyRow>

        <PropertyRow label="Tags" layout={layout}>
          <TagDisplay
            availableTags={availableTags}
            feedbackTagIds={feedbackTagIds}
            isAdmin={isAdmin}
            onToggleTag={handleToggleTag}
            validTags={validTags}
          />
        </PropertyRow>

        {isAdmin && (
          <PropertyRow label="Assignee" layout={layout}>
            <AssigneeDisplay
              assignee={assignee}
              isAdmin={isAdmin}
              members={members}
              onAssigneeChange={handleAssigneeChange}
            />
          </PropertyRow>
        )}

        {isAdmin && (
          <PropertyRow label="Deadline" layout={layout}>
            <DeadlineDisplay
              deadline={deadline}
              isOpen={deadlineOpen}
              onChange={handleDeadlineChange}
              onClear={handleDeadlineClear}
              onOpenChange={setDeadlineOpen}
            />
          </PropertyRow>
        )}
      </div>

      {feedback.isMember && (
        <AiAnalysisDisplay
          {...feedback}
          feedbackId={feedbackId}
          isAdmin={isAdmin}
          layout={layout}
        />
      )}

      {layout === "bar" && <div className="flex-1" />}

      <div
        className={
          layout === "panel"
            ? "flex items-center justify-between gap-3 border-t pt-3"
            : "contents"
        }
      >
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
          showLabel={layout === "panel"}
        />
      </div>
    </div>
  );
}
