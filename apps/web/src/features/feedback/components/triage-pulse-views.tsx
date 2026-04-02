"use client";

import { CaretRight, Check, Sparkle, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiMiniIndicator } from "@/features/feedback/components/ai-mini-indicator";
import { cn } from "@/lib/utils";

export function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
          color
        )}
      />
      <span
        className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)}
      />
    </span>
  );
}

export function ProcessingIndicator({
  processed,
  total,
  failed,
}: {
  processed: number;
  total: number;
  failed: number;
}) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
            {/* Animated progress ring */}
            <div className="relative h-4 w-4 shrink-0">
              <svg
                aria-label={`Progress: ${percentage}%`}
                className="h-4 w-4 -rotate-90"
                role="img"
                viewBox="0 0 16 16"
              >
                <circle
                  className="stroke-current text-muted"
                  cx="8"
                  cy="8"
                  fill="none"
                  r="6"
                  strokeWidth="2"
                />
                <circle
                  className="stroke-current text-primary transition-all duration-500 ease-out"
                  cx="8"
                  cy="8"
                  fill="none"
                  r="6"
                  strokeDasharray={`${percentage * 0.377} 37.7`}
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Progress text */}
            <div className="flex items-baseline gap-1">
              <span className="font-medium text-xs tabular-nums">
                {processed}
                <span className="text-muted-foreground">/{total}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">tagged</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  failed > 0 ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        }
      />
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">AI auto-tagging in progress</p>
          <p className="text-muted-foreground">
            {processed} of {total} items processed ({percentage}%)
          </p>
          {failed > 0 && <p className="text-amber-500">{failed} failed</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TaggedItem {
  _id: Id<"feedback">;
  aiComplexity?: string | null;
  aiPriority?: string | null;
  aiTimeEstimate?: string | null;
  tags: Array<{ _id: Id<"tags">; name: string; color: string } | null>;
  title: string;
}

export function ResultsPopover({
  failed,
  onDismiss,
  organizationId,
  since,
  successful,
}: {
  failed: number;
  onDismiss: () => void;
  organizationId: Id<"organizations">;
  since: number;
  successful: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasFailed = failed > 0;

  const recentItems = useQuery(
    api.feedback.auto_tagging.getRecentlyTaggedItems,
    { organizationId, since }
  );

  const handleDismiss = () => {
    setIsOpen(false);
    onDismiss();
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger
        render={
          <button
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-300",
              hasFailed
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
            )}
            type="button"
          >
            {hasFailed ? (
              <Warning className="h-3.5 w-3.5" weight="bold" />
            ) : (
              <Check className="h-3.5 w-3.5" weight="bold" />
            )}
            <span className="font-medium">
              {successful} tagged{hasFailed ? `, ${failed} failed` : ""}
            </span>
            <CaretRight className="h-3 w-3 opacity-60" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" />
            <span className="font-medium text-sm">Auto-tag results</span>
          </div>
          <Button
            className="h-6 px-2 text-xs"
            onClick={handleDismiss}
            size="xs"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>

        {/* Results list */}
        <ScrollArea classNameViewport="max-h-64">
          <div className="divide-y">
            {recentItems?.map((item: TaggedItem) => {
              const validTags = item.tags.filter(
                (tag): tag is NonNullable<typeof tag> => tag !== null
              );
              const hasTags = validTags.length > 0;
              const isUncategorized =
                !hasTags && (!item.aiPriority || item.aiPriority === "none");

              return (
                <div className="px-3 py-2.5" key={item._id}>
                  <p className="line-clamp-1 font-medium text-sm">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {validTags.map((tag) => (
                      <Badge
                        className="h-5 font-normal text-[10px]"
                        color={tag.color}
                        key={tag._id}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {isUncategorized && (
                      <Badge
                        className="h-5 border-dashed font-normal text-[10px]"
                        color="gray"
                      >
                        Unsorted
                      </Badge>
                    )}
                    {item.aiPriority && item.aiPriority !== "none" && (
                      <AiMiniIndicator
                        label={item.aiPriority}
                        type={item.aiPriority}
                      />
                    )}
                    {item.aiComplexity && item.aiComplexity !== "trivial" && (
                      <AiMiniIndicator
                        label={item.aiComplexity}
                        type={item.aiComplexity}
                      />
                    )}
                    {item.aiTimeEstimate &&
                      item.aiTimeEstimate !== "N/A" &&
                      item.aiTimeEstimate !== "none" && (
                        <span className="text-[10px] text-muted-foreground">
                          ~{item.aiTimeEstimate}
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
            {recentItems?.length === 0 && (
              <p className="px-3 py-4 text-center text-muted-foreground text-sm">
                No items were tagged in this run.
              </p>
            )}
            {recentItems === undefined && (
              <div className="space-y-3 px-3 py-3">
                <div className="space-y-1.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex gap-1">
                    <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="flex gap-1">
                    <div className="h-4 w-14 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 w-10 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="flex gap-1">
                    <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
