import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ctrl-ui/react/ui/context-menu";
import { Chat, PushPin, Sparkle, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";
import { AiMiniIndicator } from "./ai-mini-indicator";

interface FeedbackTag {
  _id: Id<"tags">;
  appliedByAi?: boolean;
  color: string;
  icon?: string;
  name: string;
}

interface BoardStatusInfo {
  color: string;
  name: string;
}

interface FeedbackListItemProps {
  className?: string;
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
  isAdmin?: boolean;
  isAuthor?: boolean;
  onClick?: (feedbackId: Id<"feedback">) => void;
}

export function FeedbackListItem({
  feedback,
  onClick,
  className,
  isAdmin = false,
  isAuthor = false,
}: FeedbackListItemProps) {
  const deleteFeedback = useMutation(api.feedback.actions.remove);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const tags = feedback.tags ?? [];
  const canDelete = isAuthor || isAdmin;

  const effectivePriorityForBorder = feedback.priority ?? feedback.aiPriority;
  const priorityBorderMap = {
    critical: "border-l-4 border-l-red-500",
    high: "border-l-4 border-l-orange-500",
    low: "border-l-4 border-l-blue-300",
    medium: "border-l-4 border-l-yellow-500",
  } as const;
  const priorityBorderClass =
    (effectivePriorityForBorder &&
      priorityBorderMap[
        effectivePriorityForBorder as keyof typeof priorityBorderMap
      ]) ||
    "";

  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      return;
    }
    await deleteFeedback({ id: feedback._id });
    setShowDeleteDialog(false);
  }, [canDelete, feedback._id, deleteFeedback]);

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            className={cn(
              "flex w-full gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50",
              feedback.isPinned && "border-primary/50 bg-primary/5",
              priorityBorderClass,
              className
            )}
            onClick={handleClick}
            type="button"
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
                        <TagBadge
                          className="font-normal text-xs"
                          color={tag.color}
                          key={tag._id}
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.name}
                          {tag.appliedByAi && (
                            <span title="Applied by AI">
                              <Sparkle
                                className="h-3 w-3 opacity-60"
                                weight="fill"
                              />
                            </span>
                          )}
                        </TagBadge>
                      ))}
                    </div>
                  )}

                  {/* AI Analysis indicators */}
                  {(() => {
                    const effectivePriority =
                      feedback.priority ?? feedback.aiPriority;
                    const effectiveComplexity =
                      feedback.complexity ?? feedback.aiComplexity;
                    if (!(effectivePriority || effectiveComplexity)) {
                      return null;
                    }
                    return (
                      <div className="mt-1.5 flex items-center gap-1">
                        {effectivePriority && (
                          <AiMiniIndicator
                            isAiValue={!feedback.priority}
                            label={`P: ${effectivePriority}`}
                            type={effectivePriority}
                          />
                        )}
                        {effectiveComplexity && (
                          <AiMiniIndicator
                            isAiValue={!feedback.complexity}
                            label={`C: ${effectiveComplexity}`}
                            type={effectiveComplexity}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Status Badge from organizationStatus */}
                {feedback.organizationStatus && (
                  <TagBadge
                    className="shrink-0"
                    color={feedback.organizationStatus.color}
                  >
                    {feedback.organizationStatus.name}
                  </TagBadge>
                )}
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        {canDelete && (
          <ContextMenuContent>
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback</AlertDialogTitle>
            <AlertDialogDescription>
              This feedback will be moved to trash. You can restore it within 30
              days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={handleDelete}
              tone="danger"
              variant="surface"
            >
              Move to trash
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
