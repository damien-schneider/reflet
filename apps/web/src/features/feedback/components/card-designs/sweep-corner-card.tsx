"use client";

import { Button } from "@ctrl-ui/react/ui/button";
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
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { resolveTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import type { FeedbackItem } from "../feed-feedback-view";

interface SweepCornerFeedCardProps {
  className?: string;
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
}

export function SweepCornerFeedCard({
  feedback,
  onClick,
  className,
}: SweepCornerFeedCardProps) {
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
    <SweepCorner
      className={className}
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
            <Button
              className="static h-auto w-full cursor-pointer justify-start whitespace-normal p-0 text-left font-medium text-sm leading-snug after:absolute after:inset-0 after:content-['']"
              onClick={() => onClick?.(feedback._id)}
              variant="quiet"
            >
              {feedback.isPinned && (
                <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
              )}
              {feedback.title}
            </Button>
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
