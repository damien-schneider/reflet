"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        className={cn(
          "h-8 gap-1.5 rounded-full px-3",
          userVoteType === "upvote" &&
            "border-primary bg-primary/10 text-primary"
        )}
        onClick={() => onVote("upvote")}
        size="sm"
        variant="outline"
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
        className={cn(
          "h-8 rounded-full px-2.5",
          userVoteType === "downvote" &&
            "border-destructive bg-destructive/10 text-destructive"
        )}
        onClick={() => onVote("downvote")}
        size="sm"
        variant="outline"
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
