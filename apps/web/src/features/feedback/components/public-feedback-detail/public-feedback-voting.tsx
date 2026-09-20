"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PublicFeedbackVotingProps {
  hasVoted: boolean;
  onVote: () => void;
  primaryColor: string;
  voteCount: number;
}

export function PublicFeedbackVoting({
  voteCount,
  hasVoted,
  primaryColor,
  onVote,
}: PublicFeedbackVotingProps) {
  return (
    <Button
      aria-label={hasVoted ? "Remove vote" : "Upvote"}
      aria-pressed={hasVoted}
      className={cn(
        "h-auto flex-col rounded-lg border p-3 transition-colors hover:bg-accent",
        hasVoted && "border-primary bg-primary/10 text-primary"
      )}
      onClick={onVote}
      style={
        hasVoted
          ? {
              backgroundColor: `${primaryColor}15`,
              borderColor: primaryColor,
              color: primaryColor,
            }
          : undefined
      }
      variant="quiet"
    >
      <CaretUp className="h-5 w-5" />
      <span className="font-bold text-lg tabular-nums">{voteCount}</span>
    </Button>
  );
}
