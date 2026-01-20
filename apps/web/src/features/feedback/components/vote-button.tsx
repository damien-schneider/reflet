import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { authDialogOpenAtom } from "@/store/auth";

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
  const setAuthDialogOpen = useSetAtom(authDialogOpenAtom);
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const [isVoting, setIsVoting] = useState(false);

  const toggleVote = useMutation(api.votes.toggle);

  const handleVote = async () => {
    if (!userId) {
      setAuthDialogOpen(true);
      return;
    }

    try {
      setIsVoting(true);
      await toggleVote({ feedbackId });
    } finally {
      setIsVoting(false);
    }
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

  const button = (
    <Button
      aria-label={
        hasVoted
          ? `Remove vote (current count: ${voteCount})`
          : `Upvote (current count: ${voteCount})`
      }
      aria-pressed={hasVoted}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 font-semibold",
        sizeClasses[size],
        hasVoted && "bg-primary text-primary-foreground",
        className
      )}
      disabled={isVoting}
      onClick={handleVote}
      variant={hasVoted ? "default" : "outline"}
    >
      {isVoting ? (
        <Spinner className={iconSizes[size]} />
      ) : (
        <ChevronUp className={iconSizes[size]} />
      )}
      <span>{voteCount}</span>
    </Button>
  );

  // Show tooltip for unauthenticated users
  if (!userId) {
    return (
      <Tooltip>
        <TooltipTrigger>{button}</TooltipTrigger>
        <TooltipContent>
          <p>Sign in to vote</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
