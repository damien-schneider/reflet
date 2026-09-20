"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { TagBadge } from "@/components/tag-badge";

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

function StatusBadge({ status }: { status: string }) {
  return (
    <TagBadge
      className="shrink-0 text-xs"
      color={STATUS_COLORS[status] ?? "gray"}
    >
      {STATUS_LABELS[status] ?? status}
    </TagBadge>
  );
}

interface LinkedFeedbackListProps {
  items: Array<{ _id: Id<"feedback">; title: string; status: string }>;
  onUnlink: (feedbackId: Id<"feedback">) => void;
  releaseId: Id<"releases"> | null;
}

export function LinkedFeedbackList({
  items,
  releaseId,
  onUnlink,
}: LinkedFeedbackListProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
          key={item._id}
        >
          <Check className="h-3.5 w-3.5 shrink-0 text-success-text" />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <StatusBadge status={item.status} />
          {releaseId && (
            <Button
              aria-label={`Unlink ${item.title}`}
              className="shrink-0 text-muted-foreground hover:text-destructive-text"
              iconOnly
              onClick={() => onUnlink(item._id)}
              size="xs"
              type="button"
              variant="ghost"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

interface FeedbackSearchInputProps {
  onLink: (feedbackId: Id<"feedback">) => void;
  searchQuery: string;
  searchResults: Array<{
    _id: Id<"feedback">;
    title: string;
    status: string;
  }>;
  setSearchQuery: (query: string) => void;
}

export function FeedbackSearchInput({
  searchQuery,
  setSearchQuery,
  searchResults,
  onLink,
}: FeedbackSearchInputProps) {
  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlass className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search feedback to link"
          className="h-8 border-transparent bg-transparent pl-8 text-sm shadow-none focus-visible:border-input"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback to link..."
          value={searchQuery}
        />
      </div>
      {searchResults.length > 0 && (
        <div className="absolute right-0 left-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
          {searchResults.slice(0, 8).map((item) => (
            <Button
              className="w-full justify-start gap-2 text-left font-normal"
              key={item._id}
              onClick={() => onLink(item._id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <StatusBadge status={item.status} />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
