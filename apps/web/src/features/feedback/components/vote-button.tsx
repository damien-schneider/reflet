import { CaretUp } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  feedbackId: Id<"feedback">;
  voteCount: number;
  hasVoted?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VoteButton({
  feedbackId,
  voteCount,
  hasVoted = false,
  size = "md",
  className,
}: VoteButtonProps) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Connectez-vous pour voter sur ce feedback",
  });

  const toggleVote = useMutation(api.votes.toggle);

  const handleVote = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    authGuard(async () => {
      await toggleVote({ feedbackId, voteType: "upvote" });
    });
  };

  const sizeClasses = {
    sm: "h-8 w-10 text-xs",
    md: "h-10 w-12 text-sm",
    lg: "h-12 w-14 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const label = hasVoted ? "Remove vote" : "Upvote";

  let tooltipText = "Sign in to vote";
  if (isAuthenticated) {
    tooltipText = hasVoted ? "Remove vote" : "Upvote";
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          aria-label={label}
          aria-pressed={hasVoted}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 font-semibold",
            sizeClasses[size],
            hasVoted && "bg-primary text-primary-foreground",
            className
          )}
          onClick={handleVote}
          variant={hasVoted ? "default" : "outline"}
        >
          <CaretUp className={iconSizes[size]} />
          <span>{voteCount}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
