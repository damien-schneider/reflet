"use client";

import { Chat, PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import { AiMiniIndicator } from "../ai-mini-indicator";

interface FeedbackTag {
  _id: Id<"tags">;
  name: string;
  color: string;
  icon?: string;
  appliedByAi?: boolean;
}

interface BoardStatusInfo {
  name: string;
  color: string;
}

interface EditorialFeedCardProps {
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
}

export function EditorialFeedCard({
  feedback,
  onClick,
  className,
}: EditorialFeedCardProps) {
  const { guard: authGuard } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });
  const toggleVote = useMutation(api.votes.toggle);
  const tags = feedback.tags ?? [];
  const voted = feedback.hasVoted ?? false;
  const count = feedback.voteCount ?? 0;

  const handleVote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      authGuard(async () => {
        await toggleVote({ feedbackId: feedback._id, voteType: "upvote" });
      });
    },
    [authGuard, toggleVote, feedback._id]
  );

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  const authorName = feedback.author?.name ?? "Anonymous";
  const authorInitial = authorName[0]?.toUpperCase() ?? "?";

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: card uses nested button for vote action
    // biome-ignore lint/a11y/noStaticElementInteractions: intentional click-to-open pattern
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: matches existing FeedbackListItem pattern
    <div
      className={cn(
        "group w-full cursor-pointer rounded-xl border p-5 text-left transition-all hover:bg-accent/30 hover:shadow-sm",
        feedback.isPinned ? "border-primary/50 bg-primary/5" : "border-border",
        className
      )}
      onClick={handleClick}
    >
      {/* Header: author + timestamp + status */}
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar className="h-8 w-8">
          {feedback.author?.image && (
            <AvatarImage alt={authorName} src={feedback.author.image} />
          )}
          <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
            {authorInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <span className="font-medium text-foreground text-sm">
            {authorName}
          </span>
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </p>
        </div>
        {feedback.organizationStatus && (
          <Badge
            className="shrink-0 font-normal text-[10px]"
            color={feedback.organizationStatus.color}
          >
            {feedback.organizationStatus.name}
          </Badge>
        )}
      </div>

      {/* Title + description */}
      <h3 className="mb-1.5 font-semibold text-base text-foreground leading-snug">
        {feedback.isPinned && (
          <PushPin className="mr-1 inline h-4 w-4 text-primary" />
        )}
        {feedback.title}
      </h3>
      {feedback.description && (
        <p className="mb-3 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {feedback.description}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              className="font-normal text-[10px]"
              color={tag.color}
              key={tag._id}
            >
              {tag.icon && <span>{tag.icon}</span>}
              {tag.name}
              {tag.appliedByAi && (
                <Sparkle className="h-2.5 w-2.5 opacity-60" weight="fill" />
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* AI indicators */}
      {(() => {
        const effectivePriority = feedback.priority ?? feedback.aiPriority;
        const effectiveComplexity =
          feedback.complexity ?? feedback.aiComplexity;
        if (!(effectivePriority || effectiveComplexity)) {
          return null;
        }
        return (
          <div className="mb-3 flex items-center gap-1">
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

      {/* Footer: vote + comment count */}
      <div className="flex items-center gap-3 border-border border-t pt-3">
        <button
          aria-label={voted ? "Remove vote" : "Vote for this feedback"}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium text-sm transition-all",
            voted
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-transparent text-muted-foreground hover:border-primary/20 hover:text-foreground"
          )}
          onClick={handleVote}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill={voted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 16 16"
          >
            <path
              d="M3 10l5-6 5 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="tabular-nums">{count}</span>
        </button>

        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Chat className="h-3.5 w-3.5" />
          {feedback.commentCount}{" "}
          {feedback.commentCount === 1 ? "comment" : "comments"}
        </span>
      </div>
    </div>
  );
}
