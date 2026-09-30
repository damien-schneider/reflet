"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { FeedbackStatusBadge } from "./feedback-status-badge";

const MAX_SEARCH_RESULTS = 8;

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
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          key={item._id}
        >
          <Check
            aria-hidden="true"
            className="size-3.5 shrink-0 text-success-text"
          />
          <span className="min-w-0 flex-1 truncate" title={item.title}>
            {item.title}
          </span>
          <FeedbackStatusBadge status={item.status} />
          {releaseId && (
            <Button
              aria-label={`Unlink ${item.title}`}
              className="shrink-0"
              iconOnly
              onClick={() => onUnlink(item._id)}
              size="xs"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-3" />
            </Button>
          )}
        </li>
      ))}
    </ul>
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
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlass
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search feedback to link"
          className="pl-8"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback to link…"
          size="sm"
          type="search"
          value={searchQuery}
        />
      </div>
      {hasQuery && (
        <div
          className="absolute right-0 left-0 z-20 mt-1 max-h-40 overflow-y-auto p-1"
          data-control-family="popup"
          data-popup-part="surface"
          data-popup-static=""
        >
          {searchResults.length === 0 ? (
            <p className="px-2 py-1.5 text-muted-foreground text-sm">
              No feedback matches “{searchQuery.trim()}”.
            </p>
          ) : (
            searchResults.slice(0, MAX_SEARCH_RESULTS).map((item) => (
              <Button
                className="w-full justify-start text-left"
                key={item._id}
                onClick={() => onLink(item._id)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <span className="min-w-0 flex-1 truncate" title={item.title}>
                  {item.title}
                </span>
                <FeedbackStatusBadge status={item.status} />
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
