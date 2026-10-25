"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { CaretUp } from "@phosphor-icons/react";

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
      active={hasVoted}
      aria-label={`${hasVoted ? "Remove vote" : "Upvote"}, ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`}
      aria-pressed={hasVoted}
      layout="tile"
      onClick={onVote}
      style={{
        "--cui-button-active-background": `oklch(from ${primaryColor} l c h / 0.08)`,
        "--cui-button-active-foreground": primaryColor,
        "--cui-button-active-hover-background": `oklch(from ${primaryColor} l c h / 0.1)`,
      }}
      variant="surface"
    >
      <CaretUp className="h-5 w-5" />
      <span className="font-bold text-lg tabular-nums">{voteCount}</span>
    </Button>
  );
}
