"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { IMPORTANCE_LEVELS } from "./types";

interface ImportanceVotingProps {
  feedbackId: Id<"feedback">;
}

export function ImportanceVoting({ feedbackId }: ImportanceVotingProps) {
  const userVote = useQuery(api.feedback_importance.getUserVote, {
    feedbackId,
  });
  const stats = useQuery(api.feedback_importance.getStats, { feedbackId });
  const vote = useMutation(api.feedback_importance.vote);
  const removeVote = useMutation(api.feedback_importance.removeVote);

  const handleVote = useCallback(
    async (importance: 1 | 2 | 3 | 4) => {
      if (userVote?.importance === importance) {
        await removeVote({ feedbackId });
      } else {
        await vote({ feedbackId, importance });
      }
    },
    [feedbackId, userVote, vote, removeVote]
  );

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="mb-3 font-medium text-sm">
        How important is this post to you?
      </h3>
      <div className="flex gap-2">
        {IMPORTANCE_LEVELS.map((level) => {
          const isSelected = userVote?.importance === level.value;
          const count = stats?.distribution[level.value] ?? 0;

          return (
            <ImportanceButton
              count={count}
              emoji={level.emoji}
              isSelected={isSelected}
              key={level.value}
              label={level.label}
              onClick={() => handleVote(level.value)}
            />
          );
        })}
      </div>
      {stats && stats.totalVotes > 0 && (
        <p className="mt-3 text-muted-foreground text-xs">
          {stats.totalVotes} {stats.totalVotes === 1 ? "person" : "people"}{" "}
          voted
        </p>
      )}
    </div>
  );
}

interface ImportanceButtonProps {
  emoji: string;
  label: string;
  isSelected: boolean;
  count: number;
  onClick: () => void;
}

function ImportanceButton({
  emoji,
  label,
  isSelected,
  count,
  onClick,
}: ImportanceButtonProps) {
  return (
    <Button
      aria-label={`Vote ${label}`}
      aria-pressed={isSelected}
      className={cn(
        "flex flex-col items-center gap-1 p-3",
        isSelected && "border-primary bg-primary/10"
      )}
      onClick={onClick}
      variant="outline"
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
      {count > 0 && (
        <span className="font-medium text-muted-foreground text-xs">
          {count}
        </span>
      )}
    </Button>
  );
}
