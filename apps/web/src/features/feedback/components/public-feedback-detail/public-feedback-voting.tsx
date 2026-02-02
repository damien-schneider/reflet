"use client";

import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PublicFeedbackVotingProps {
  voteCount: number;
  hasVoted: boolean;
  primaryColor: string;
  onVote: () => void;
}

export function PublicFeedbackVoting({
  voteCount,
  hasVoted,
  primaryColor,
  onVote,
}: PublicFeedbackVotingProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent",
        hasVoted && "border-primary bg-primary/10 text-primary"
      )}
      onClick={onVote}
      style={
        hasVoted
          ? {
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }
          : undefined
      }
      type="button"
    >
      <CaretUp className="h-5 w-5" />
      <span className="font-bold text-lg">{voteCount}</span>
    </button>
  );
}
