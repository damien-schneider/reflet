"use client";

import {
  CaretUp as ChevronUp,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PublicFeedbackDetailContent } from "./public-feedback-detail-content";

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
    boardId: string;
    tags?: Array<{ _id: string; name: string; color: string } | null>;
  };
  statuses: Array<{ _id: string; name: string; color: string }>;
  primaryColor: string;
  boardId: Id<"boards">;
  isMember?: boolean;
  isAdmin?: boolean;
  onVote: (e: React.MouseEvent, feedbackId: string) => void;
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
      <button
        className="w-full text-left"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Card
          className={cn(
            "feedback-card cursor-pointer transition-all hover:shadow-md",
            feedback.isPinned && "border-primary/30 bg-primary/5"
          )}
          style={
            {
              "--feedback-card-name": `feedback-${feedback._id}`,
            } as React.CSSProperties
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-4">
              {/* Vote button */}
              <button
                className={cn(
                  "flex flex-col items-center rounded-lg border p-2 transition-colors hover:bg-accent",
                  feedback.hasVoted &&
                    "border-primary bg-primary/10 text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(e, feedback._id);
                }}
                style={
                  feedback.hasVoted
                    ? {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                      }
                    : undefined
                }
                type="button"
              >
                <ChevronUp className="h-4 w-4" />
                <span className="font-semibold text-sm">
                  {feedback.voteCount}
                </span>
              </button>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{feedback.title}</h3>
                  {status && (
                    <Badge
                      className="shrink-0"
                      style={{
                        backgroundColor: `${status.color}20`,
                        color: status.color,
                      }}
                      variant="secondary"
                    >
                      {status.name}
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {feedback.tags && feedback.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {feedback.tags
                      .filter(
                        (tag): tag is NonNullable<typeof tag> => tag !== null
                      )
                      .map((tag) => (
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

                {/* Description preview */}
                {feedback.description && (
                  <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                    {feedback.description}
                  </p>
                )}

                {/* Meta */}
                <div className="mt-3 flex items-center gap-4 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {feedback.commentCount} comments
                  </span>
                  <span>
                    {formatDistanceToNow(feedback.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </button>

      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogContent className="max-w-2xl p-0">
          <PublicFeedbackDetailContent
            boardId={boardId}
            feedbackId={feedback._id as Id<"feedback">}
            isAdmin={isAdmin}
            isMember={isMember}
            primaryColor={primaryColor}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
