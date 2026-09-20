"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Sparkle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  closed: "Closed",
  completed: "Completed",
  in_progress: "In Progress",
  open: "Open",
  planned: "Planned",
  under_review: "Under Review",
};

const STATUS_COLORS: Record<string, string> = {
  closed: "gray",
  completed: "green",
  in_progress: "yellow",
  open: "blue",
  planned: "purple",
  under_review: "orange",
};

const CONFIDENCE_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-success", label: "High confidence" },
  low: { dot: "bg-destructive", label: "Low confidence" },
  medium: { dot: "bg-warning", label: "Medium confidence" },
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

function SuggestionRow({
  isSelected,
  item,
  onToggleSelection,
}: {
  isSelected: boolean;
  item: SuggestedFeedbackItem;
  onToggleSelection: (feedbackId: string, checked: boolean) => void;
}) {
  const confidence = CONFIDENCE_STYLES[item.match.confidence];
  const confidenceText = `${confidence?.label ?? "Unknown confidence"} — ${item.match.reason}`;
  const checkboxId = `feedback-suggestion-${item._id}`;

  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      <Checkbox
        checked={isSelected}
        id={checkboxId}
        onCheckedChange={(checked) => onToggleSelection(item._id, checked)}
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={confidenceText}
              className="size-5"
              iconOnly
              shape="circle"
              size="xs"
              type="button"
              variant="quiet"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  confidence?.dot ?? "bg-muted-foreground"
                )}
              />
            </Button>
          }
        />
        <TooltipContent>{confidenceText}</TooltipContent>
      </Tooltip>
      <label
        className="min-w-0 flex-1 cursor-pointer truncate"
        htmlFor={checkboxId}
      >
        {item.title}
      </label>
      <TagBadge
        className="shrink-0 text-xs"
        color={STATUS_COLORS[item.status] ?? "gray"}
      >
        {STATUS_LABELS[item.status] ?? item.status}
      </TagBadge>
    </li>
  );
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
          <Sparkle className="h-3.5 w-3.5 text-brand-text" />
          AI Suggestions
          <Badge className="text-xs tabular-nums">{items.length}</Badge>
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            className="h-6 text-xs"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            size="xs"
            type="button"
            variant="ghost"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
          {selectedIds.size > 0 && hasReleaseId && (
            <Button
              className="h-6 gap-1 text-xs tabular-nums"
              disabled={isLinking}
              onClick={onLinkSelected}
              size="xs"
              tone="primary"
              type="button"
              variant="solid"
            >
              {isLinking ? <Spinner size="xs" /> : null}
              Link {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <SuggestionRow
            isSelected={selectedIds.has(item._id)}
            item={item}
            key={item._id}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </ul>
    </div>
  );
}
