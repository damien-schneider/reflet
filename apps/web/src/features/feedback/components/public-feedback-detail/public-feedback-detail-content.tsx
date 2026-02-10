"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { PublicFeedbackComments } from "./public-feedback-comments";
import { PublicFeedbackHeader } from "./public-feedback-header";
import { PublicFeedbackVoting } from "./public-feedback-voting";

interface PublicFeedbackDetailContentProps {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
  primaryColor: string;
  isMember?: boolean;
  isAdmin?: boolean;
}

export function PublicFeedbackDetailContent({
  feedbackId,
  organizationId,
  primaryColor,
  isMember: _isMember = false,
  isAdmin = false,
}: PublicFeedbackDetailContentProps) {
  const feedback = useQuery(api.feedback.get, { id: feedbackId });
  const comments = useQuery(api.comments.list, { feedbackId });
  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const toggleVote = useMutation(api.votes.toggle);
  const createComment = useMutation(api.comments.create);
  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const togglePin = useMutation(api.feedback_actions.togglePin);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleVote = useCallback(async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleStatusChange = useCallback(
    async (statusId: string | null) => {
      if (!statusId) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        organizationStatusId: statusId as Id<"organizationStatuses">,
      });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleTogglePin = useCallback(async () => {
    await togglePin({ id: feedbackId });
  }, [feedbackId, togglePin]);

  const handleSubmitComment = useCallback(async () => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      return;
    }
    setIsSubmittingComment(true);
    try {
      await createComment({ feedbackId, body: trimmedComment });
      setNewComment("");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [feedbackId, newComment, createComment]);

  const isLoading = feedback === undefined;
  const currentStatus = organizationStatuses?.find(
    (s) => s._id === feedback?.organizationStatusId
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Feedback not found
      </div>
    );
  }

  return (
    <div className="flex max-h-[90vh] flex-col">
      <div className="flex items-start justify-between border-b p-6">
        <div className="flex items-start gap-4">
          <PublicFeedbackVoting
            hasVoted={feedback.hasVoted}
            onVote={handleVote}
            primaryColor={primaryColor}
            voteCount={feedback.voteCount}
          />

          <PublicFeedbackHeader
            commentCount={feedback.commentCount}
            createdAt={feedback.createdAt}
            currentStatus={currentStatus}
            hasVoted={feedback.hasVoted}
            isAdmin={isAdmin}
            isPinned={feedback.isPinned}
            onStatusChange={handleStatusChange}
            onTogglePin={handleTogglePin}
            onVote={handleVote}
            organizationStatuses={organizationStatuses}
            organizationStatusId={feedback.organizationStatusId ?? null}
            primaryColor={primaryColor}
            title={feedback.title}
            voteCount={feedback.voteCount}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="mb-2 font-medium">Description</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {feedback.description || "No description provided."}
          </p>
        </div>

        {feedback.tags && feedback.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {feedback.tags
                .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
                .map((tag) => (
                  <Badge
                    className="font-normal"
                    color={tag.color}
                    key={tag._id}
                  >
                    {tag.icon && <span>{tag.icon}</span>}
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <Separator className="my-6" />

        <PublicFeedbackComments
          comments={comments}
          isSubmittingComment={isSubmittingComment}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          onSubmitComment={handleSubmitComment}
        />
      </div>
    </div>
  );
}
