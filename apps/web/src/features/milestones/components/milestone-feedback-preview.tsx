"use client";

import { CaretUp } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

interface FeedbackPreviewItem {
  _id: string;
  title: string;
  voteCount: number;
  status: string;
}

interface MilestoneFeedbackPreviewProps {
  items: (FeedbackPreviewItem | null)[];
  totalCount: number;
  onFeedbackClick?: (feedbackId: string) => void;
  className?: string;
}

export function MilestoneFeedbackPreview({
  items,
  totalCount,
  onFeedbackClick,
  className,
}: MilestoneFeedbackPreviewProps) {
  const validItems = items.filter(
    (item): item is FeedbackPreviewItem => item !== null
  );
  const overflow = totalCount - validItems.length;

  if (validItems.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-xs italic", className)}>
        No linked feedback
      </p>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {validItems.map((item) => (
        <button
          className={cn(
            "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs",
            "transition-colors hover:bg-accent/50",
            item.status === "completed" && "line-through opacity-60"
          )}
          key={item._id}
          onClick={(e) => {
            e.stopPropagation();
            onFeedbackClick?.(item._id);
          }}
          type="button"
        >
          <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground tabular-nums">
            <CaretUp className="h-2.5 w-2.5" />
            {item.voteCount}
          </span>
          <span className="truncate text-foreground/80">{item.title}</span>
        </button>
      ))}
      {overflow > 0 && (
        <span className="block px-1 text-[11px] text-muted-foreground">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
