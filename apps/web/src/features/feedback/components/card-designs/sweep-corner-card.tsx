"use client";

import { PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard as SweepCornerCardUI,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
} from "@reflet/ui/feedback-sweep-corner";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";

interface SweepCornerFeedCardProps {
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
}

export function SweepCornerFeedCard({
  feedback,
  onClick,
  className,
}: SweepCornerFeedCardProps) {
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
      <SweepCorner
        downvotes={feedback.downvoteCount ?? 0}
        onVote={handleVote}
        upvotes={feedback.upvoteCount ?? feedback.voteCount ?? 0}
        voteType={feedback.userVoteType ?? null}
      >
        <SweepCornerCardUI
          className={cn(feedback.isPinned && "border-primary/50 bg-primary/5")}
        >
          <SweepCornerContent>
            <SweepCornerTitle>
              {feedback.isPinned && (
                <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
              )}
              {feedback.title}
            </SweepCornerTitle>
            {feedback.organizationStatus && (
              <SweepCornerTag color={feedback.organizationStatus.color}>
                {feedback.organizationStatus.name}
              </SweepCornerTag>
            )}
            {tags.length > 0 && (
              <SweepCornerTags>
                {tags.map(
                  (tag) =>
                    tag && (
                      <SweepCornerTag color={tag.color} key={tag._id}>
                        {tag.icon && <span>{tag.icon}</span>}
                        {tag.name}
                        {tag.appliedByAi && (
                          <Sparkle
                            className="h-2.5 w-2.5 opacity-60"
                            weight="fill"
                          />
                        )}
                      </SweepCornerTag>
                    )
                )}
              </SweepCornerTags>
            )}
          </SweepCornerContent>
          <SweepCornerFooter
            comments={feedback.commentCount}
            time={formatDistanceToNow(feedback.createdAt, {
              addSuffix: true,
            })}
          />
        </SweepCornerCardUI>
        <SweepCornerBadge />
      </SweepCorner>
    </div>
  );
}
