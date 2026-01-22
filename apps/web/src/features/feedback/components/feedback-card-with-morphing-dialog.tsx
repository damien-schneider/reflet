"use client";

import {
  CaretDown as ChevronDown,
  CaretUp as ChevronUp,
  Chat as MessageSquare,
  PushPin,
} from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FeedbackDetailDialog } from "./feedback-detail";

interface FeedbackCardWithMorphingDialogProps {
  feedback: {
    _id: string;
    title: string;
    description?: string;
    voteCount: number;
    commentCount: number;
    createdAt: number;
    statusId?: string;
    isPinned?: boolean;
    hasVoted?: boolean;
    userVoteType?: "upvote" | "downvote" | null;
    upvoteCount?: number;
    downvoteCount?: number;
    boardId: string;
    tags?: Array<{ _id: string; name: string; color: string } | null>;
  };
  statuses: Array<{ _id: string; name: string; color: string }>;
  primaryColor: string;
  boardId: Id<"boards">;
  isMember?: boolean;
  isAdmin?: boolean;
  onVote: (
    e: React.MouseEvent,
    feedbackId: string,
    voteType: "upvote" | "downvote"
  ) => void;
}

export function FeedbackCardWithMorphingDialog({
  feedback,
  statuses,
  primaryColor,
  boardId,
  isMember = false,
  isAdmin = false,
  onVote,
}: FeedbackCardWithMorphingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statuses.find((s) => s._id === feedback.statusId);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: Using div because button cannot contain nested buttons */}
      <div
        className="w-full cursor-pointer text-left"
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="group flex gap-3">
          {/* Main card */}
          <div
            className={cn(
              "feedback-card flex-1 cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-border hover:shadow-foreground/5 hover:shadow-md",
              "feedback-card cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-border hover:shadow-foreground/5 hover:shadow-md",
              feedback.isPinned &&
                "border-olive-300/50 from-olive-50 to-olive-100/50 dark:border-olive-700/50 dark:from-olive-950/50 dark:to-olive-950/30"
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
                  <div className="flex items-center gap-2">
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
                      style={{
                        backgroundColor: `${status.color}15`,
                        color: status.color,
                        borderColor: `${status.color}30`,
                      }}
                      variant="outline"
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
                    .filter(
                      (tag): tag is NonNullable<typeof tag> => tag !== null
                    )
                    .map((tag) => (
                      <Badge
                        className="font-normal text-[10px]"
                        key={tag._id}
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}30`,
                        }}
                        variant="outline"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                </div>
              )}

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
          <div className="flex flex-row gap-3 self-stretch sm:flex-col">
            <button
              className={cn(
                "flex-1 shrink-0 flex-col items-center justify-center rounded-xl border border-border/50 bg-muted/50 px-3 py-1.5 transition-all hover:bg-muted hover:shadow-sm",
                feedback.userVoteType === "upvote"
                  ? "border-olive-400 bg-olive-100 text-olive-700 shadow-sm dark:border-olive-600 dark:bg-olive-900/50 dark:text-olive-300"
                  : ""
              )}
              onClick={(e) => {
                e.stopPropagation();
                onVote(e, feedback._id, "upvote");
              }}
              style={
                feedback.userVoteType === "upvote"
                  ? {
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                    }
                  : undefined
              }
              type="button"
            >
              <ChevronUp className="h-3.5 w-3.5" weight="bold" />
              <span className="font-semibold text-[10px]">
                {feedback.upvoteCount ?? 0}
              </span>
            </button>

            <button
              className={cn(
                "flex-1 shrink-0 flex-col items-center justify-center rounded-xl border border-border/50 bg-muted/50 px-3 py-1.5 transition-all hover:bg-muted hover:shadow-sm",
                feedback.userVoteType === "downvote"
                  ? "border-red-400 bg-red-100 text-red-700 shadow-sm dark:border-red-600 dark:bg-red-900/50 dark:text-red-300"
                  : ""
              )}
              onClick={(e) => {
                e.stopPropagation();
                onVote(e, feedback._id, "downvote");
              }}
              type="button"
            >
              <ChevronDown className="h-3.5 w-3.5" weight="bold" />
              <span className="font-semibold text-[10px]">
                {feedback.downvoteCount ?? 0}
              </span>
            </button>
          </div>
        </div>
      </div>

      <FeedbackDetailDialog
        boardId={boardId}
        feedbackId={isOpen ? (feedback._id as Id<"feedback">) : null}
        isAdmin={isAdmin}
        isMember={isMember}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
