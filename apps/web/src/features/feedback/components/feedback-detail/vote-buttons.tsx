"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";

export function VoteButtons({
  voteCount,
  userVoteType,
  onVote,
}: {
  voteCount: number;
  userVoteType: "upvote" | "downvote" | null;
  onVote: (voteType: "upvote" | "downvote") => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        active={userVoteType === "upvote"}
        className="h-8 gap-1.5"
        onClick={() => onVote("upvote")}
        shape="circle"
        size="xs"
        variant="surface"
      >
        <ArrowUp
          className={cn(
            "h-3.5 w-3.5",
            userVoteType === "upvote" && "fill-current"
          )}
          weight={userVoteType === "upvote" ? "fill" : "regular"}
        />
        <span className="font-semibold tabular-nums">{voteCount}</span>
      </Button>
      <Button
        active={userVoteType === "downvote"}
        className="h-8"
        onClick={() => onVote("downvote")}
        shape="circle"
        size="xs"
        tone={userVoteType === "downvote" ? "danger" : "neutral"}
        variant="surface"
      >
        <ArrowDown
          className={cn(
            "h-3.5 w-3.5",
            userVoteType === "downvote" && "fill-current"
          )}
          weight={userVoteType === "downvote" ? "fill" : "regular"}
        />
      </Button>
    </div>
  );
}
