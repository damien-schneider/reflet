import { Button } from "@ctrl-ui/react/ui/button";
import { Chat, PushPin, Sparkle } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { TagBadge } from "@/components/tag-badge";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";
import { AiMiniIndicator } from "./ai-mini-indicator";
import { FeedbackDeleteMenu } from "./feedback-delete-menu";
import { InternalBadge } from "./internal-badge";
import { NeedsReviewBadge, needsHumanReview } from "./needs-review-badge";

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

const PRIORITY_BORDER: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-500",
  low: "border-l-4 border-l-blue-300",
  medium: "border-l-4 border-l-yellow-500",
};

export function FeedbackListItem({
  feedback,
  onClick,
  className,
  isAdmin = false,
  isAuthor = false,
}: FeedbackListItemProps) {
  const tags = feedback.tags ?? [];
  const effectivePriority = feedback.priority ?? feedback.aiPriority;
  const effectiveComplexity = feedback.complexity ?? feedback.aiComplexity;

  return (
    <FeedbackDeleteMenu
      canDelete={isAuthor || isAdmin}
      feedbackId={feedback._id}
    >
      <div className="relative">
        <Button
          className={cn(
            "group h-auto w-full items-start justify-start gap-4 whitespace-normal rounded-lg border p-4 pl-20 text-left transition-colors hover:bg-accent/50",
            feedback.isPinned && "border-primary/50 bg-primary/5",
            effectivePriority && PRIORITY_BORDER[effectivePriority],
            className
          )}
          onClick={() => onClick?.(feedback._id)}
          variant="quiet"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-brand-text">
                  {feedback.isPinned && (
                    <PushPin className="mr-1 inline h-4 w-4 text-brand-text" />
                  )}
                  {feedback.isInternal && <InternalBadge className="mr-1" />}
                  {feedback.title}
                </h3>

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
                    <span className="tabular-nums">
                      {feedback.commentCount}
                    </span>
                  </span>
                </div>

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
                          <>
                            <Sparkle
                              className="h-3 w-3 opacity-60"
                              weight="fill"
                            />
                            <span className="sr-only">Applied by AI</span>
                          </>
                        )}
                      </TagBadge>
                    ))}
                  </div>
                )}

                {(effectivePriority ||
                  effectiveComplexity ||
                  needsHumanReview(feedback.aiNeedsReview)) && (
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
                    <NeedsReviewBadge probability={feedback.aiNeedsReview} />
                  </div>
                )}
              </div>

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
        </Button>

        <VoteButton
          className="absolute top-4 left-4"
          feedbackId={feedback._id}
          hasVoted={feedback.hasVoted}
          size="md"
          voteCount={feedback.voteCount ?? 0}
        />
      </div>
    </FeedbackDeleteMenu>
  );
}
