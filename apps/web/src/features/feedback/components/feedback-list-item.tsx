import { Chat, PushPin, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ContextList,
  ContextListContent,
  ContextListItem,
  ContextListTrigger,
} from "@/components/ui/context-menu";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";

interface FeedbackTag {
  _id: Id<"tags">;
  name: string;
  color: string;
}

interface BoardStatusInfo {
  name: string;
  color: string;
}

interface FeedbackListItemProps {
  feedback: Doc<"feedback"> & {
    hasVoted?: boolean;
    tags?: FeedbackTag[];
    boardStatus?: BoardStatusInfo | null;
    author?: {
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  };
  onClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
  isAdmin?: boolean;
  isAuthor?: boolean;
  boardId?: Id<"boards">;
}

export function FeedbackListItem({
  feedback,
  onClick,
  className,
  isAdmin = false,
  isAuthor = false,
  boardId,
}: FeedbackListItemProps) {
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const tags = feedback.tags ?? [];
  const canDelete = isAuthor || isAdmin;

  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      return;
    }

    // Confirm before deleting
    if (
      // biome-ignore lint/suspicious/noAlert: Simple confirmation for destructive action
      !window.confirm(
        `Are you sure you want to delete "${feedback.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    await deleteFeedback({ id: feedback._id });
  }, [canDelete, feedback._id, feedback.title, deleteFeedback]);

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  return (
    <ContextList>
      <ContextListTrigger>
        <button
          className={cn(
            "flex w-full gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50",
            feedback.isPinned && "border-primary/50 bg-primary/5",
            className
          )}
          onClick={handleClick}
          type="button"
        >
          {/* Vote button */}
          <VoteButton
            boardId={boardId}
            feedbackId={feedback._id}
            hasVoted={feedback.hasVoted}
            size="md"
            voteCount={feedback.voteCount ?? 0}
          />

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Title */}
                <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-primary">
                  {feedback.isPinned && (
                    <PushPin className="mr-1 inline h-4 w-4 text-primary" />
                  )}
                  {feedback.title}
                </h3>

                {/* Meta info */}
                <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                  <span>{feedback.author?.name ?? "Unknown"}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(feedback.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Chat className="h-3 w-3" />
                    {feedback.commentCount}
                  </span>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        className="text-xs"
                        key={tag._id}
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                        variant="secondary"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Badge from boardStatus */}
              {feedback.boardStatus && (
                <Badge
                  className="shrink-0"
                  style={{
                    backgroundColor: `${feedback.boardStatus.color}20`,
                    color: feedback.boardStatus.color,
                    borderColor: feedback.boardStatus.color,
                  }}
                  variant="outline"
                >
                  {feedback.boardStatus.name}
                </Badge>
              )}
            </div>
          </div>
        </button>
      </ContextListTrigger>
      {canDelete && (
        <ContextListContent>
          <ContextListItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </ContextListItem>
        </ContextListContent>
      )}
    </ContextList>
  );
}
