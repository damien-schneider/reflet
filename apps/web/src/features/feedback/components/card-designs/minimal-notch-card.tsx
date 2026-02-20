"use client";

import { Chat, PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";

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

interface MinimalNotchCardProps {
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

export function MinimalNotchCard({
  feedback,
  onClick,
  className,
}: MinimalNotchCardProps) {
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

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: card uses nested button for vote action
    // biome-ignore lint/a11y/noStaticElementInteractions: intentional click-to-open pattern
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: matches existing FeedbackListItem pattern
    <div
      className={cn(
        "group relative flex w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all hover:bg-accent/30 hover:shadow-sm",
        feedback.isPinned ? "border-primary/50 bg-primary/5" : "border-border",
        className
      )}
      onClick={handleClick}
    >
      {/* Left notch vote indicator */}
      <button
        aria-label={voted ? "Remove vote" : "Vote for this feedback"}
        className={cn(
          "flex w-12 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-border border-r bg-transparent transition-colors",
          voted ? "border-r-primary/30 bg-primary/5" : "hover:bg-muted/50"
        )}
        onClick={handleVote}
        type="button"
      >
        {/* Notch indicator */}
        <div
          className={cn(
            "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all duration-300",
            voted
              ? "bg-primary opacity-100"
              : "bg-border opacity-0 group-hover:opacity-40"
          )}
        />
        <svg
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition-colors",
            voted ? "text-primary" : "text-muted-foreground"
          )}
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
        <span
          className={cn(
            "font-bold text-xs tabular-nums transition-colors",
            voted ? "text-primary" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      </button>

      {/* Card body */}
      <div className="flex-1 space-y-2.5 p-3.5">
        <div>
          <h3 className="line-clamp-2 font-semibold text-foreground text-sm leading-snug">
            {feedback.isPinned && (
              <PushPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
            )}
            {feedback.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {feedback.organizationStatus && (
            <Badge
              className="font-normal text-[10px]"
              color={feedback.organizationStatus.color}
            >
              {feedback.organizationStatus.name}
            </Badge>
          )}
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

        {/* AI indicators */}
        {(() => {
          const effectivePriority = feedback.priority ?? feedback.aiPriority;
          const effectiveComplexity =
            feedback.complexity ?? feedback.aiComplexity;
          if (!(effectivePriority || effectiveComplexity)) {
            return null;
          }
          return (
            <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{feedback.author?.name ?? "Anonymous"}</span>
          <span className="opacity-40">·</span>
          <span>
            {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            <Chat className="h-3 w-3" />
            {feedback.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
