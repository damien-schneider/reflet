"use client";

import { Button } from "@ctrl-ui/react/ui/button";
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
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { resolveTagColor } from "@/lib/tag-colors";
import type { FeedbackItem } from "../feed-feedback-view";
import { InternalBadge } from "../internal-badge";

interface EditorialFeedFeedCardProps {
  className?: string;
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
}

export function EditorialFeedFeedCard({
  feedback,
  onClick,
  className,
}: EditorialFeedFeedCardProps) {
  const { guard: authGuard } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });
  const toggleVote = useMutation(api.feedback.votes.toggle);
  const tags = (feedback.tags ?? []).filter(Boolean);

  const handleVote = (direction: "upvote" | "downvote") => {
    authGuard(async () => {
      await toggleVote({ feedbackId: feedback._id, voteType: direction });
    });
  };

  return (
    <EditorialFeedItem
      className={className}
      downvotes={feedback.downvoteCount ?? 0}
      onVote={handleVote}
      upvotes={feedback.upvoteCount ?? feedback.voteCount ?? 0}
      voteType={feedback.userVoteType ?? null}
    >
      <EditorialFeedVote />
      <EditorialFeedRule />
      <EditorialFeedContent>
        <EditorialFeedTitle>
          <Button
            className="static h-auto w-full cursor-pointer justify-start whitespace-normal p-0 text-left text-base leading-snug after:absolute after:inset-y-0 after:right-0 after:left-16 after:content-['']"
            onClick={() => onClick?.(feedback._id)}
            variant="quiet"
          >
            {feedback.isPinned && (
              <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
            )}
            {feedback.isInternal && <InternalBadge className="mr-1" />}
            {feedback.title}
          </Button>
        </EditorialFeedTitle>
        <EditorialFeedMeta>
          {feedback.organizationStatus && (
            <EditorialFeedStatus
              color={resolveTagColor(feedback.organizationStatus.color)}
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
                    <>
                      <Sparkle
                        className="ml-0.5 inline h-2 w-2 opacity-60"
                        weight="fill"
                      />
                      <span className="sr-only">Applied by AI</span>
                    </>
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
  );
}
