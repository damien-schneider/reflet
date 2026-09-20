"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { CaretRight, Check, Sparkle, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/utils";
import { AiMiniIndicator } from "./ai-mini-indicator";

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
          <Button
            className={cn(
              "h-auto shrink-0 gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-300",
              hasFailed
                ? "border-warning/30 bg-warning-subtle text-warning-text"
                : "border-success/30 bg-success-subtle text-success-text"
            )}
            variant="surface"
          />
        }
      >
        {hasFailed ? (
          <Warning className="h-3.5 w-3.5" weight="bold" />
        ) : (
          <Check className="h-3.5 w-3.5" weight="bold" />
        )}
        <span className="font-medium tabular-nums">
          {successful} tagged{hasFailed ? `, ${failed} failed` : ""}
        </span>
        <CaretRight className="h-3 w-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
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
        <ScrollArea viewportClassName="max-h-64">
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
                      <TagBadge
                        className="h-5 font-normal text-caption"
                        color={tag.color}
                        key={tag._id}
                      >
                        {tag.name}
                      </TagBadge>
                    ))}
                    {isUncategorized && (
                      <TagBadge
                        className="h-5 border-dashed font-normal text-caption"
                        color="gray"
                      >
                        Unsorted
                      </TagBadge>
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
                        <span className="text-micro text-muted-foreground">
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
