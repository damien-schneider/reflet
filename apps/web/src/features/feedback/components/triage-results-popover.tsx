"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CaretRight, Check, Sparkle, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { TagBadge } from "@/components/tag-badge";

interface TriagedItem {
  _id: Id<"feedback">;
  tags: Array<{ _id: Id<"tags">; name: string; color: string } | null>;
  title: string;
}

const RESULT_SKELETON_WIDTHS = ["w-3/4", "w-2/3", "w-4/5"] as const;

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
    api.feedback.auto_tagging.getRecentTriageResults,
    { organizationId, since }
  );

  const handleDismiss = () => {
    setIsOpen(false);
    onDismiss();
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger render={<Button size="xs" variant="surface" />}>
        {hasFailed ? (
          <Warning
            aria-hidden
            className="size-3.5 text-warning-text"
            weight="bold"
          />
        ) : (
          <Check
            aria-hidden
            className="size-3.5 text-success-text"
            weight="bold"
          />
        )}
        <span className="tabular-nums">
          {successful} triaged{hasFailed ? `, ${failed} failed` : ""}
        </span>
        <CaretRight aria-hidden className="size-3 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" padding="none">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <PopoverTitle className="flex items-center gap-1.5 font-medium text-sm">
            <Sparkle
              aria-hidden
              className="size-3.5 text-primary"
              weight="fill"
            />
            Triage results
          </PopoverTitle>
          <Button onClick={handleDismiss} size="xs" variant="ghost">
            Dismiss
          </Button>
        </div>
        <ScrollArea viewportClassName="max-h-64">
          <ul className="divide-y">
            {recentItems?.map((item: TriagedItem) => {
              const validTags = item.tags.filter(
                (tag): tag is NonNullable<typeof tag> => tag !== null
              );

              return (
                <li className="px-3 py-2.5" key={item._id}>
                  <p
                    className="truncate font-medium text-sm"
                    title={item.title}
                  >
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {validTags.map((tag) => (
                      <TagBadge color={tag.color} key={tag._id} size="sm">
                        {tag.name}
                      </TagBadge>
                    ))}
                    {validTags.length === 0 && (
                      <TagBadge size="sm" variant="outline">
                        Unsorted
                      </TagBadge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {recentItems?.length === 0 && (
            <p className="px-3 py-4 text-center text-muted-foreground text-sm">
              No items were tagged in this run.
            </p>
          )}
          {recentItems === undefined && (
            <div aria-busy="true" className="space-y-3 p-3">
              {RESULT_SKELETON_WIDTHS.map((width) => (
                <div className="space-y-1.5" key={width}>
                  <Skeleton className={cn("h-4", width)} />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
