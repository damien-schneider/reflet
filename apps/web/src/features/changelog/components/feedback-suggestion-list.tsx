"use client";

import { Sparkle, Spinner } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  open: "blue",
  under_review: "orange",
  planned: "purple",
  in_progress: "yellow",
  completed: "green",
  closed: "gray",
};

const CONFIDENCE_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-green-500", label: "High confidence" },
  medium: { dot: "bg-yellow-500", label: "Medium confidence" },
  low: { dot: "bg-orange-400", label: "Low confidence" },
};

interface SuggestedFeedbackItem {
  _id: Id<"feedback">;
  match: { confidence: "high" | "medium" | "low"; reason: string };
  status: string;
  title: string;
}

interface FeedbackSuggestionListProps {
  allSelected: boolean;
  hasReleaseId: boolean;
  isLinking: boolean;
  items: SuggestedFeedbackItem[];
  onDeselectAll: () => void;
  onLinkSelected: () => void;
  onSelectAll: () => void;
  onToggleSelection: (feedbackId: string, checked: boolean) => void;
  selectedIds: Set<string>;
}

export function FeedbackSuggestionList({
  items,
  selectedIds,
  allSelected,
  isLinking,
  hasReleaseId,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onLinkSelected,
}: FeedbackSuggestionListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-xs">
          <Sparkle className="h-3.5 w-3.5 text-purple-500" />
          AI Suggestions
          <Badge className="text-xs" variant="secondary">
            {items.length}
          </Badge>
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            className="h-6 text-xs"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            size="sm"
            type="button"
            variant="ghost"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
          {selectedIds.size > 0 && hasReleaseId && (
            <Button
              className="h-6 gap-1 text-xs"
              disabled={isLinking}
              onClick={onLinkSelected}
              size="sm"
              type="button"
              variant="default"
            >
              {isLinking ? <Spinner className="h-3 w-3 animate-spin" /> : null}
              Link {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const conf = CONFIDENCE_STYLES[item.match.confidence];
          return (
            <div
              aria-selected={selectedIds.has(item._id)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              key={item._id}
              onClick={() =>
                onToggleSelection(item._id, !selectedIds.has(item._id))
              }
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onToggleSelection(item._id, !selectedIds.has(item._id));
                }
              }}
              role="option"
              tabIndex={0}
            >
              <Checkbox
                checked={selectedIds.has(item._id)}
                onCheckedChange={(checked) =>
                  onToggleSelection(item._id, checked === true)
                }
              />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        conf?.dot ?? "bg-gray-400"
                      )}
                    />
                  }
                />
                <TooltipContent>
                  {conf?.label ?? "Unknown"} — {item.match.reason}
                </TooltipContent>
              </Tooltip>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <Badge
                className="shrink-0 text-xs"
                variant={
                  (STATUS_COLORS[item.status] as
                    | "green"
                    | "blue"
                    | "orange"
                    | "purple"
                    | "yellow"
                    | "gray") ?? "gray"
                }
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
