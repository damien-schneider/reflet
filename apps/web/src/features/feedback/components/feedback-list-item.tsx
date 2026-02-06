import { Chat, PushPin, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { type KeyboardEvent, useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    organizationStatus?: BoardStatusInfo | null;
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
}

export function FeedbackListItem({
  feedback,
  onClick,
  className,
  isAdmin = false,
  isAuthor = false,
}: FeedbackListItemProps) {
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const tags = feedback.tags ?? [];
  const canDelete = isAuthor || isAdmin;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = useCallback(async () => {
    await deleteFeedback({ id: feedback._id });
    setIsDeleteDialogOpen(false);
  }, [feedback._id, deleteFeedback]);

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Don't trigger if the event originated from an interactive element
      if (e.target !== e.currentTarget) {
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <>
      <ContextList>
        <ContextListTrigger>
          {/* biome-ignore lint/a11y/useSemanticElements: Nested interactive elements (VoteButton) require a non-button container for valid HTML */}
          <div
            className={cn(
              "group flex w-full cursor-pointer gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              feedback.isPinned && "border-primary/50 bg-primary/5",
              className
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            {/* Vote button */}
            <VoteButton
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
                  <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-olive-600">
                    {feedback.isPinned && (
                      <PushPin className="mr-1 inline h-4 w-4 text-olive-600" />
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
                          className="font-normal text-xs"
                          color={tag.color}
                          key={tag._id}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Badge from organizationStatus */}
                {feedback.organizationStatus && (
                  <Badge
                    className="shrink-0"
                    style={{
                      backgroundColor: `${feedback.organizationStatus.color}20`,
                      color: feedback.organizationStatus.color,
                      borderColor: feedback.organizationStatus.color,
                    }}
                    variant="outline"
                  >
                    {feedback.organizationStatus.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ContextListTrigger>
        {canDelete && (
          <ContextListContent>
            <ContextListItem
              className="text-destructive focus:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextListItem>
          </ContextListContent>
        )}
      </ContextList>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              feedback &quot;{feedback.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
