"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AiAnalysisDisplay } from "./ai-analysis-display";
import { AssigneeDisplay } from "./assignee-display";
import { CopyForAgents } from "./copy-for-agents";
import { DeadlineDisplay } from "./deadline-display";
import type { FeedbackTag } from "./feedback-metadata-types";
import { StatusDisplay } from "./status-display";
import { SubscribeButton } from "./subscribe-button";
import { TagDisplay } from "./tag-display";
import { VoteButtons } from "./vote-buttons";

interface FeedbackMetadataBarProps {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
  voteCount: number;
  userVoteType: "upvote" | "downvote" | null;
  createdAt: number;
  organizationStatusId?: Id<"organizationStatuses"> | null;
  author?: {
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  isAdmin: boolean;
  tags?: Array<FeedbackTag | null>;
  title: string;
  description: string | null;
  attachments?: string[];
  aiPriority?: "critical" | "high" | "medium" | "low" | "none" | null;
  aiPriorityReasoning?: string | null;
  aiComplexity?:
    | "trivial"
    | "simple"
    | "moderate"
    | "complex"
    | "very_complex"
    | null;
  aiComplexityReasoning?: string | null;
  aiTimeEstimate?: string | null;
  priority?: "critical" | "high" | "medium" | "low" | "none" | null;
  complexity?:
    | "trivial"
    | "simple"
    | "moderate"
    | "complex"
    | "very_complex"
    | null;
  timeEstimate?: string | null;
  deadline?: number | null;
}

export function FeedbackMetadataBar({
  feedbackId,
  organizationId,
  voteCount,
  userVoteType,
  organizationStatusId,
  assignee,
  isAdmin,
  tags: feedbackTags,
  title,
  description,
  attachments,
  aiPriority,
  aiPriorityReasoning,
  aiComplexity,
  aiComplexityReasoning,
  aiTimeEstimate,
  priority,
  complexity,
  timeEstimate,
  deadline,
}: FeedbackMetadataBarProps) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });
  const members = useQuery(
    api.members.list,
    isAdmin ? { organizationId } : "skip"
  );
  const availableTags = useQuery(
    api.tags.list,
    isAdmin ? { organizationId } : "skip"
  );
  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });

  const toggleVote = useMutation(api.votes.toggle);
  const updateStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const assignFeedback = useMutation(api.feedback_actions.assign);
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);
  const updateAnalysis = useMutation(api.feedback_actions.updateAnalysis);
  const addTagMutation = useMutation(api.tags.addToFeedback);
  const removeTagMutation = useMutation(api.tags.removeFromFeedback);

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === organizationStatusId
  );

  const validTags = (feedbackTags ?? []).filter(
    (t): t is FeedbackTag => t !== null
  );
  const feedbackTagIds = new Set(validTags.map((t) => t._id));

  const handleVote = useCallback(
    async (voteType: "upvote" | "downvote") => {
      if (!isAuthenticated) {
        authGuard(() => undefined);
        return;
      }
      await toggleVote({ feedbackId, voteType });
    },
    [feedbackId, toggleVote, isAuthenticated, authGuard]
  );

  const handleStatusChange = useCallback(
    async (statusId: Id<"organizationStatuses"> | null) => {
      if (statusId) {
        await updateStatus({
          feedbackId,
          organizationStatusId: statusId,
        });
      }
    },
    [feedbackId, updateStatus]
  );

  const handleAssigneeChange = useCallback(
    async (assigneeId: string) => {
      await assignFeedback({
        feedbackId,
        assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
      });
    },
    [feedbackId, assignFeedback]
  );

  const handleToggleTag = useCallback(
    async (tagId: Id<"tags">, isCurrentlyApplied: boolean) => {
      if (isCurrentlyApplied) {
        await removeTagMutation({ feedbackId, tagId });
      } else {
        await addTagMutation({ feedbackId, tagId });
      }
    },
    [feedbackId, addTagMutation, removeTagMutation]
  );

  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleDeadlineChange = useCallback(
    async (date: Date) => {
      await updateAnalysis({ feedbackId, deadline: date.getTime() });
      setDeadlineOpen(false);
    },
    [feedbackId, updateAnalysis]
  );

  const handleDeadlineClear = useCallback(async () => {
    await updateAnalysis({ feedbackId, clearDeadline: true });
    setDeadlineOpen(false);
  }, [feedbackId, updateAnalysis]);

  const handleToggleSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription, isAuthenticated, authGuard]);

  const hasDetailsContent =
    isAdmin ||
    aiPriority ||
    aiComplexity ||
    aiTimeEstimate ||
    priority ||
    complexity ||
    timeEstimate;

  return (
    <Collapsible onOpenChange={setDetailsOpen} open={detailsOpen}>
      {/* Primary row */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
        <VoteButtons
          onVote={handleVote}
          userVoteType={userVoteType}
          voteCount={voteCount}
        />

        {/* Status */}
        <StatusDisplay
          currentStatus={currentStatus}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          organizationStatuses={organizationStatuses}
          statusId={organizationStatusId}
        />

        {/* Tags */}
        <TagDisplay
          availableTags={availableTags}
          feedbackTagIds={feedbackTagIds}
          isAdmin={isAdmin}
          onToggleTag={handleToggleTag}
          validTags={validTags}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Copy for agents (admin only) */}
        {isAdmin && (
          <CopyForAgents
            attachments={attachments}
            description={description}
            organizationId={organizationId}
            tags={feedbackTags}
            title={title}
          />
        )}

        <SubscribeButton
          isSubscribed={isSubscribed}
          onToggle={handleToggleSubscription}
        />

        {/* Details toggle */}
        {hasDetailsContent && (
          <CollapsibleTrigger
            render={
              <Button size="sm" variant="ghost">
                <span className="text-xs">Details</span>
                {detailsOpen ? (
                  <CaretUp className="h-3.5 w-3.5" />
                ) : (
                  <CaretDown className="h-3.5 w-3.5" />
                )}
              </Button>
            }
          />
        )}
      </div>

      {/* Collapsible details row */}
      <CollapsibleContent>
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
          {/* AI Analysis (priority, complexity, time estimate) */}
          <AiAnalysisDisplay
            aiComplexity={aiComplexity}
            aiComplexityReasoning={aiComplexityReasoning}
            aiPriority={aiPriority}
            aiPriorityReasoning={aiPriorityReasoning}
            aiTimeEstimate={aiTimeEstimate}
            complexity={complexity}
            feedbackId={feedbackId}
            isAdmin={isAdmin}
            priority={priority}
            timeEstimate={timeEstimate}
          />

          {/* Deadline */}
          {isAdmin && (
            <DeadlineDisplay
              deadline={deadline}
              isOpen={deadlineOpen}
              onChange={handleDeadlineChange}
              onClear={handleDeadlineClear}
              onOpenChange={setDeadlineOpen}
            />
          )}

          {/* Assignee */}
          <AssigneeDisplay
            assignee={assignee}
            isAdmin={isAdmin}
            members={members}
            onAssigneeChange={handleAssigneeChange}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
