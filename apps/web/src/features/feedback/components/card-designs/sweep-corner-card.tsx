"use client";

import { Button } from "@ctrl-ui/react/ui/button";

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
import { FeedbackPropertiesPopover } from "@/features/feedback/components/properties/feedback-properties-popover";
import { FeedbackPropertySummary } from "@/features/feedback/components/properties/feedback-property-summary";
import { resolveTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";

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
        className={cn(
          "cursor-pointer",
          feedback.isPinned && "border-primary/50 bg-primary/5"
        )}
      >
        <SweepCornerContent>
          <SweepCornerTitle>
            <Button
              className="wrap-anywhere static isolation-auto h-auto w-full cursor-pointer justify-start whitespace-normal text-pretty px-0 py-0 text-left font-[inherit] text-inherit outline-none after:absolute after:inset-0 after:z-10 after:rounded-xl hover:bg-transparent focus-visible:after:ring-2 focus-visible:after:ring-ring"
              onClick={() => onClick?.(feedback._id)}
              variant="ghost"
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
              {feedback.title}
            </Button>
          </SweepCornerTitle>
          <FeedbackPropertySummary feedback={feedback} />
          {feedback.isMember && (
            <FeedbackPropertiesPopover feedbackId={feedback._id} />
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
