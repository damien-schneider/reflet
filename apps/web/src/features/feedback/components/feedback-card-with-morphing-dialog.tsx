"use client";

import {
  CaretDown as ChevronDown,
  CaretUp as ChevronUp,
  Chat as MessageSquare,
  PushPin,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
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
import { cn } from "@/lib/utils";
import { AiMiniIndicator } from "./ai-mini-indicator";
import { useFeedbackBoard } from "./feedback-board/feedback-board-context";

interface FeedbackCardWithMorphingDialogProps {
  feedback: {
    _id: string;
    title: string;
    description?: string;
    voteCount: number;
    commentCount: number;
    createdAt: number;
    isPinned?: boolean;
    hasVoted?: boolean;
    userVoteType?: "upvote" | "downvote" | null;
    upvoteCount?: number;
    downvoteCount?: number;
    tags?: Array<{
      _id: string;
      name: string;
      color: string;
      icon?: string;
      appliedByAi?: boolean;
    } | null>;
    organizationStatusId?: string;
    organizationStatus?: { name: string; color: string; icon?: string } | null;
    aiPriority?: string | null;
    aiComplexity?: string | null;
    priority?: string | null;
    complexity?: string | null;
  };
}

export function FeedbackCardWithMorphingDialog({
  feedback,
}: FeedbackCardWithMorphingDialogProps) {
  const { statuses, primaryColor, isAdmin, onVote, onFeedbackClick } =
    useFeedbackBoard();
  const deleteFeedback = useMutation(api.feedback_actions.remove);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get status from organizationStatus or find by organizationStatusId
  const status =
    feedback.organizationStatus ??
    statuses.find((s) => s._id === feedback.organizationStatusId);

  const handleClick = () => {
    onFeedbackClick(feedback._id);
  };

  const handleDelete = useCallback(async () => {
    await deleteFeedback({ id: feedback._id as Id<"feedback"> });
    setShowDeleteDialog(false);
  }, [feedback._id, deleteFeedback]);

  const card = (
    // biome-ignore lint/a11y/useSemanticElements: Using div because button cannot contain nested buttons
    <div
      className="w-full cursor-pointer text-left outline-none"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="group flex gap-3">
        {/* Main card */}
        <div
          className={cn(
            "feedback-card flex-1 cursor-pointer rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-black/5",
            feedback.isPinned &&
              "border-olive-300/50 from-olive-50 to-olive-100/50 dark:border-olive-700/50 dark:from-olive-950/50 dark:to-olive-950/30",
            "min-w-0"
          )}
          style={
            {
              "--feedback-card-name": `feedback-${feedback._id}`,
            } as React.CSSProperties
          }
        >
          <div className="space-y-3 px-4 pt-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  {feedback.isPinned && (
                    <PushPin
                      className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400"
                      weight="fill"
                    />
                  )}
                  <h3 className="truncate font-medium text-sm leading-snug">
                    {feedback.title}
                  </h3>
                </div>
                {status && (
                  <Badge
                    className="mt-1.5 font-normal text-[10px]"
                    color={status.color}
                  >
                    {status.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 pt-2 pb-4">
            {/* Tags */}
            {feedback.tags && feedback.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {feedback.tags
                  .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
                  .map((tag) => (
                    <Badge
                      className="font-normal text-[10px]"
                      color={tag.color}
                      key={tag._id}
                    >
                      {tag.icon && <span>{tag.icon}</span>}
                      {tag.name}
                      {tag.appliedByAi && (
                        <span title="Applied by AI">
                          <Sparkle
                            className="h-2.5 w-2.5 opacity-60"
                            weight="fill"
                          />
                        </span>
                      )}
                    </Badge>
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
                <div className="mt-1 flex items-center gap-1">
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

            {/* Meta */}
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {feedback.commentCount}
              </span>
              <span className="opacity-70">
                {formatDistanceToNow(feedback.createdAt, {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Vote buttons */}
        <div className="flex flex-col gap-1 self-stretch">
          <button
            className={cn(
              "flex flex-1 shrink-0 flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-3 py-2 transition-all hover:bg-muted hover:shadow-sm",
              feedback.userVoteType === "upvote"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/80"
                : ""
            )}
            onClick={(e) => {
              e.stopPropagation();
              onVote(e, feedback._id, "upvote");
            }}
            style={
              feedback.userVoteType === "upvote" && primaryColor
                ? {
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }
                : undefined
            }
            type="button"
          >
            <ChevronUp className="h-4 w-4" weight="bold" />
            <span className="font-medium text-xs">
              {feedback.upvoteCount ?? 0}
            </span>
          </button>

          <button
            className={cn(
              "flex flex-1 shrink-0 flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-3 py-2 transition-all hover:bg-muted hover:shadow-sm",
              feedback.userVoteType === "downvote"
                ? "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80"
                : ""
            )}
            onClick={(e) => {
              e.stopPropagation();
              onVote(e, feedback._id, "downvote");
            }}
            type="button"
          >
            <ChevronDown className="h-4 w-4" weight="bold" />
            <span className="font-medium text-xs">
              {feedback.downvoteCount ?? 0}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!isAdmin) {
    return card;
  }

  return (
    <>
      <ContextList>
        <ContextListTrigger>{card}</ContextListTrigger>
        <ContextListContent>
          <ContextListItem
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </ContextListItem>
        </ContextListContent>
      </ContextList>

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
