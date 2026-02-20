"use client";

import { Chat, PushPin, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";

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

interface SweepCornerCardProps {
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

export function SweepCornerCard({
  feedback,
  onClick,
  className,
}: SweepCornerCardProps) {
  const { guard: authGuard } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });
  const toggleVote = useMutation(api.votes.toggle);
  const [isAnimating, setIsAnimating] = useState(false);
  const tags = feedback.tags ?? [];
  const voted = feedback.hasVoted ?? false;
  const count = feedback.voteCount ?? 0;

  const handleVote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      authGuard(async () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
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
        "group relative w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all hover:bg-accent/30 hover:shadow-sm",
        feedback.isPinned ? "border-primary/50 bg-primary/5" : "border-border",
        className
      )}
      onClick={handleClick}
    >
      {/* Corner vote badge */}
      <button
        aria-label={voted ? "Remove vote" : "Vote for this feedback"}
        className={cn(
          "absolute top-0 right-0 z-10 flex h-14 w-14 cursor-pointer items-center justify-end border-none bg-transparent p-0",
          "before:absolute before:top-0 before:right-0 before:h-0 before:w-0",
          "before:border-t-[56px] before:border-t-current before:border-l-[56px] before:border-l-transparent",
          "before:transition-all before:duration-200",
          voted
            ? "text-primary before:opacity-100"
            : "text-muted before:opacity-70 hover:before:opacity-100"
        )}
        onClick={handleVote}
        type="button"
      >
        <span
          className={cn(
            "relative -mt-9 mr-1.5 flex flex-col items-center leading-none transition-transform duration-200",
            isAnimating && "animate-[sweep-bounce_0.6s_ease-out]"
          )}
        >
          <svg
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              voted
                ? "text-primary-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={voted ? 2.5 : 2}
            viewBox="0 0 16 16"
          >
            <path
              d="M8 12V4M8 4L4 8M8 4L12 8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className={cn(
              "font-bold text-[10px] tabular-nums",
              voted
                ? "text-primary-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {count}
          </span>
        </span>
      </button>

      {/* Card body */}
      <div className="space-y-2.5 p-4 pr-16">
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

      <style>{`
        @keyframes sweep-bounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.3) translateY(-2px); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
