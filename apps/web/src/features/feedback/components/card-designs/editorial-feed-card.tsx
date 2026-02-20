"use client";

import { PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  EditorialFeedComments,
  EditorialFeedContent,
  EditorialFeedItem,
  EditorialFeedMeta,
  EditorialFeedRule,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedTime,
  EditorialFeedTitle,
  EditorialFeedVote,
} from "@reflet/ui/feedback-editorial-feed";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";

interface EditorialFeedFeedCardProps {
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
}

export function EditorialFeedFeedCard({
  feedback,
  onClick,
  className,
}: EditorialFeedFeedCardProps) {
  const { guard: authGuard } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });
  const toggleVote = useMutation(api.votes.toggle);
  const tags = (feedback.tags ?? []).filter(Boolean);

  const handleVote = useCallback(
    (direction: "upvote" | "downvote") => {
      authGuard(async () => {
        await toggleVote({ feedbackId: feedback._id, voteType: direction });
      });
    },
    [authGuard, toggleVote, feedback._id]
  );

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: card uses nested buttons for vote actions
    // biome-ignore lint/a11y/noStaticElementInteractions: intentional click-to-open pattern
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: matches existing FeedbackListItem pattern
    <div className={cn("cursor-pointer", className)} onClick={handleClick}>
      <EditorialFeedItem
        downvotes={feedback.downvoteCount ?? 0}
        onVote={handleVote}
        upvotes={feedback.upvoteCount ?? feedback.voteCount ?? 0}
        voteType={feedback.userVoteType ?? null}
      >
        <EditorialFeedVote />
        <EditorialFeedRule />
        <EditorialFeedContent>
          <EditorialFeedTitle>
            {feedback.isPinned && (
              <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
            )}
            {feedback.title}
          </EditorialFeedTitle>
          <EditorialFeedMeta>
            {feedback.organizationStatus && (
              <EditorialFeedStatus
                color={
                  feedback.organizationStatus.color as
                    | "purple"
                    | "green"
                    | "blue"
                    | "red"
                    | "amber"
                    | "pink"
                    | "gray"
                }
              >
                {feedback.organizationStatus.name}
              </EditorialFeedStatus>
            )}
            {tags.map(
              (tag) =>
                tag && (
                  <EditorialFeedTag key={tag._id}>
                    {tag.name}
                    {tag.appliedByAi && (
                      <Sparkle
                        className="ml-0.5 inline h-2 w-2 opacity-60"
                        weight="fill"
                      />
                    )}
                  </EditorialFeedTag>
                )
            )}
            <EditorialFeedComments count={feedback.commentCount} />
            <EditorialFeedTime>
              {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
            </EditorialFeedTime>
          </EditorialFeedMeta>
        </EditorialFeedContent>
      </EditorialFeedItem>
    </div>
  );
}
