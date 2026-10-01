"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Separator } from "@ctrl-ui/react/ui/separator";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { FeedbackMetadataBar } from "@/features/feedback/components/feedback-detail/feedback-metadata-bar";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useMakeFeedbackPublic } from "../../hooks/use-make-feedback-public";

import { PublicFeedbackComments } from "./public-feedback-comments";
import { PublicFeedbackHeader } from "./public-feedback-header";
import { PublicFeedbackVoting } from "./public-feedback-voting";

interface PublicFeedbackDetailContentProps {
  feedbackId: Id<"feedback">;
  isAdmin?: boolean;
  isMember?: boolean;
  organizationId: Id<"organizations">;
  primaryColor: string;
}

export function PublicFeedbackDetailContent({
  feedbackId,
  organizationId,
  primaryColor,
  isMember: _isMember = false,
  isAdmin = false,
}: PublicFeedbackDetailContentProps) {
  const feedback = useQuery(api.feedback.queries.get, { id: feedbackId });
  const comments = useQuery(api.feedback.comments.list, { feedbackId });
  const organizationStatuses = useQuery(api.organizations.statuses.list, {
    organizationId,
  });

  const toggleVote = useMutation(api.feedback.votes.toggle);
  const createComment = useMutation(api.feedback.comments.create);
  const updateFeedbackStatus = useMutation(
    api.feedback.triage_actions.updateOrganizationStatus
  );
  const togglePin = useMutation(api.feedback.actions.togglePin);
  const { makePublic } = useMakeFeedbackPublic(feedbackId);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { isAuthenticated, guard } = useAuthGuard({
    message: "Sign in to comment on this feedback",
  });

  const handleVote = async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  };

  const handleStatusChange = async (
    statusId: Id<"organizationStatuses"> | null
  ) => {
    if (!statusId) {
      return;
    }
    await updateFeedbackStatus({
      feedbackId,
      organizationStatusId: statusId,
    });
  };

  const handleTogglePin = async () => {
    await togglePin({ id: feedbackId });
  };

  const handleSubmitComment = () => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      return;
    }
    guard(async () => {
      setIsSubmittingComment(true);
      try {
        await createComment({ body: trimmedComment, feedbackId });
        setNewComment("");
      } catch {
        toast.error("Couldn’t post your comment. Try again.");
      }
      setIsSubmittingComment(false);
    });
  };

  const isLoading = feedback === undefined;
  const currentStatus = organizationStatuses?.find(
    (s) => s._id === feedback?.organizationStatusId
  );

  if (isLoading) {
    return (
      <div aria-busy="true" className="p-6">
        <span className="sr-only">Loading feedback…</span>
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
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Feedback not found</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or the link is wrong.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex max-h-[90vh] flex-col">
      <div className="border-b p-6">
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
            isInternal={feedback.isInternal ?? false}
            isPinned={feedback.isPinned}
            onMakePublic={makePublic}
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

      <FeedbackMetadataBar feedback={feedback} isAdmin={isAdmin} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h3 className="mb-2 font-medium text-sm">Description</h3>
          <p className="max-w-prose whitespace-pre-wrap text-pretty text-muted-foreground">
            {feedback.description || "No description provided."}
          </p>
        </div>

        <Separator className="my-6" />

        <PublicFeedbackComments
          comments={comments}
          isAuthenticated={isAuthenticated}
          isSubmittingComment={isSubmittingComment}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          onSubmitComment={handleSubmitComment}
        />
      </div>
    </div>
  );
}
