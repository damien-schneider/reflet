"use client";

import { PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  MinimalNotch,
  MinimalNotchCard as MinimalNotchCardUI,
  MinimalNotchMeta,
  MinimalNotchStatus,
  MinimalNotchTag,
  MinimalNotchTags,
  MinimalNotchTitle,
  MinimalNotchVote,
} from "@reflet/ui/feedback-minimal-notch";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";

interface MinimalNotchFeedCardProps {
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
}

export function MinimalNotchFeedCard({
  feedback,
  onClick,
  className,
}: MinimalNotchFeedCardProps) {
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
    // biome-ignore lint/a11y/useSemanticElements: card container with nested interactive buttons cannot be a <button>
    <div
      className={cn("cursor-pointer", className)}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <MinimalNotch
        downvotes={feedback.downvoteCount ?? 0}
        onVote={handleVote}
        upvotes={feedback.upvoteCount ?? feedback.voteCount ?? 0}
        voteType={feedback.userVoteType ?? null}
      >
        <MinimalNotchCardUI
          className={cn(feedback.isPinned && "border-primary/50 bg-primary/5")}
        >
          <MinimalNotchTitle>
            {feedback.isPinned && (
              <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
            )}
            {feedback.title}
          </MinimalNotchTitle>
          {feedback.organizationStatus && (
            <MinimalNotchStatus
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
            </MinimalNotchStatus>
          )}
          {tags.length > 0 && (
            <MinimalNotchTags>
              {tags.map(
                (tag) =>
                  tag && (
                    <MinimalNotchTag
                      color={
                        tag.color as
                          | "purple"
                          | "green"
                          | "blue"
                          | "red"
                          | "amber"
                          | "pink"
                          | "gray"
                      }
                      key={tag._id}
                    >
                      {tag.icon && <span>{tag.icon}</span>}
                      {tag.name}
                      {tag.appliedByAi && (
                        <Sparkle
                          className="h-2.5 w-2.5 opacity-60"
                          weight="fill"
                        />
                      )}
                    </MinimalNotchTag>
                  )
              )}
            </MinimalNotchTags>
          )}
          <MinimalNotchMeta
            comments={feedback.commentCount}
            time={formatDistanceToNow(feedback.createdAt, {
              addSuffix: true,
            })}
          />
        </MinimalNotchCardUI>
        <MinimalNotchVote />
      </MinimalNotch>
    </div>
  );
}
