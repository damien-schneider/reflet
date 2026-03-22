"use client";

import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

// --- StatusBadge shared util ---

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className="shrink-0 text-xs"
      variant={
        (STATUS_COLORS[status] as
          | "green"
          | "blue"
          | "orange"
          | "purple"
          | "yellow"
          | "gray") ?? "gray"
      }
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// --- Linked Feedback List ---

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
          <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <StatusBadge status={item.status} />
          {releaseId && (
            <Button
              className="h-5 w-5 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onUnlink(item._id)}
              size="sm"
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

// --- Manual Feedback Search ---

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
          className="h-8 border-transparent bg-transparent pl-8 text-sm shadow-none focus-visible:border-input"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback to link..."
          value={searchQuery}
        />
      </div>
      {searchResults.length > 0 && (
        <div className="absolute right-0 left-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
          {searchResults.slice(0, 8).map((item) => (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
              key={item._id}
              onClick={() => onLink(item._id)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
