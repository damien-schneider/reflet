"use client";

import { PushPin, Sparkle } from "@phosphor-icons/react";
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
import { formatDistanceToNow } from "date-fns";
import { resolveTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";
import { InternalBadge } from "../internal-badge";

interface SweepCornerFeedCardProps {
  className?: string;
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
  onVote: (feedbackId: Id<"feedback">, voteType: "upvote" | "downvote") => void;
}

export function SweepCornerFeedCard({
  feedback,
  onClick,
  onVote,
  className,
}: SweepCornerFeedCardProps) {
  const tags = (feedback.tags ?? []).filter(Boolean);

  return (
    <SweepCorner
      className={className}
      downvotes={feedback.downvoteCount ?? 0}
      onVote={(direction) => onVote(feedback._id, direction)}
      upvotes={feedback.upvoteCount ?? feedback.voteCount}
      voteType={feedback.userVoteType ?? null}
    >
      <SweepCornerCardUI
        className={cn(feedback.isPinned && "border-primary/50 bg-primary/5")}
      >
        <SweepCornerContent>
          <SweepCornerTitle>
            <button
              className="wrap-anywhere w-full cursor-pointer text-pretty text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              onClick={() => onClick?.(feedback._id)}
              type="button"
            >
              {feedback.isPinned && (
                <>
                  <PushPin
                    aria-hidden
                    className="mr-1 inline size-3.5 align-[-2px] text-primary"
                    weight="fill"
                  />
                  <span className="sr-only">Pinned: </span>
                </>
              )}
              {feedback.isInternal && <InternalBadge className="mr-1" />}
              {feedback.title}
            </button>
          </SweepCornerTitle>
          {feedback.organizationStatus && (
            <SweepCornerTag
              color={resolveTagColor(feedback.organizationStatus.color)}
            >
              {feedback.organizationStatus.name}
            </SweepCornerTag>
          )}
          {tags.length > 0 && (
            <SweepCornerTags>
              {tags.map(
                (tag) =>
                  tag && (
                    <SweepCornerTag
                      color={resolveTagColor(tag.color)}
                      key={tag._id}
                    >
                      {tag.icon && <span>{tag.icon}</span>}
                      {tag.name}
                      {tag.appliedByAi && (
                        <>
                          <Sparkle
                            className="h-2.5 w-2.5 opacity-60"
                            weight="fill"
                          />
                          <span className="sr-only">Applied by AI</span>
                        </>
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
  );
}
