import { CaretUp } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import {
  feedbackMagnifyingGlassAtom,
  feedbackSortAtom,
  selectedStatusesAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface VoteButtonProps {
  feedbackId: Id<"feedback">;
  voteCount: number;
  hasVoted?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  boardId?: Id<"boards">;
}

export function VoteButton({
  feedbackId,
  voteCount,
  hasVoted = false,
  size = "md",
  className,
  boardId,
}: VoteButtonProps) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Connectez-vous pour voter sur ce feedback",
  });

  const search = useAtomValue(feedbackMagnifyingGlassAtom);
  const sortBy = useAtomValue(feedbackSortAtom);
  const selectedStatuses = useAtomValue(selectedStatusesAtom);
  const selectedTagIds = useAtomValue(selectedTagIdsAtom);

  // Map sort option to Convex sort type
  const convexSortBy = (() => {
    switch (sortBy) {
      case "most_votes":
        return "votes" as const;
      case "most_comments":
        return "comments" as const;
      default:
        return sortBy as "newest" | "oldest";
    }
  })();

  const toggleVote = useMutation(api.votes.toggle).withOptimisticUpdate(
    (localStore) => {
      if (!boardId) {
        return;
      }

      // Update list query
      const listArgs = {
        boardId,
        search: search || undefined,
        sortBy: convexSortBy,
        status: selectedStatuses[0] as Doc<"feedback">["status"],
        tagIds:
          selectedTagIds.length > 0
            ? (selectedTagIds as Id<"tags">[])
            : undefined,
      };

      const currentList = localStore.getQuery(api.feedback_list.list, listArgs);
      if (currentList) {
        const updatedList = currentList.map((item) => {
          if (item._id === feedbackId) {
            const newHasVoted = !item.hasVoted;
            return {
              ...item,
              hasVoted: newHasVoted,
              voteCount: (item.voteCount ?? 0) + (newHasVoted ? 1 : -1),
            };
          }
          return item;
        });
        localStore.setQuery(api.feedback_list.list, listArgs, updatedList);
      }

      // Update roadmap list query
      const roadmapArgs = { boardId };
      const currentRoadmapList = localStore.getQuery(
        api.feedback_list.listForRoadmap,
        roadmapArgs
      );
      if (currentRoadmapList) {
        const updatedRoadmapList = currentRoadmapList.map((item) => {
          if (item._id === feedbackId) {
            const newHasVoted = !item.hasVoted;
            return {
              ...item,
              hasVoted: newHasVoted,
              voteCount: (item.voteCount ?? 0) + (newHasVoted ? 1 : -1),
            };
          }
          return item;
        });
        localStore.setQuery(
          api.feedback_list.listForRoadmap,
          roadmapArgs,
          updatedRoadmapList
        );
      }
    }
  );

  const handleVote = () => {
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

  const button = (
    <Button
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
  );

  // Show tooltip for unauthenticated users
  if (!isAuthenticated) {
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
