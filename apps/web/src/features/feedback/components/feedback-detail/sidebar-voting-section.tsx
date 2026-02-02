"use client";

import { CaretUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarVotingSectionProps {
  hasVoted: boolean;
  voteCount: number;
  onVote: () => void;
}

export function SidebarVotingSection({
  hasVoted,
  voteCount,
  onVote,
}: SidebarVotingSectionProps) {
  return (
    <div>
      <Button
        className={cn(
          "w-full justify-start gap-3",
          hasVoted && "border-olive-600 bg-olive-600/10 text-olive-600"
        )}
        onClick={onVote}
        variant="outline"
      >
        <CaretUp className="h-5 w-5" />
        <span className="font-bold">{voteCount}</span>
        <span className="text-muted-foreground">Upvoters</span>
      </Button>
    </div>
  );
}
