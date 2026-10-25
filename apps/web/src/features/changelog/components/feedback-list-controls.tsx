"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
} from "@ctrl-ui/react/ui/autocomplete";
import { Button } from "@ctrl-ui/react/ui/button";
import { InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
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

interface SearchResult {
  _id: Id<"feedback">;
  status: string;
  title: string;
}

interface FeedbackSearchInputProps {
  onLink: (feedbackId: Id<"feedback">) => void;
  searchQuery: string;
  searchResults: SearchResult[];
  setSearchQuery: (query: string) => void;
}

export function FeedbackSearchInput({
  searchQuery,
  setSearchQuery,
  searchResults,
  onLink,
}: FeedbackSearchInputProps) {
  return (
    <Autocomplete
      filter={null}
      items={searchResults.slice(0, MAX_SEARCH_RESULTS)}
      itemToStringValue={(item: SearchResult) => item.title}
      onValueChange={setSearchQuery}
      value={searchQuery}
    >
      <AutocompleteInputGroup size="sm">
        <InputGroupAddon>
          <MagnifyingGlass aria-hidden="true" className="size-3.5" />
        </InputGroupAddon>
        <AutocompleteInput
          aria-label="Search feedback to link"
          placeholder="Search feedback to link…"
        />
      </AutocompleteInputGroup>
      <AutocompleteContent>
        <AutocompleteEmpty>
          No feedback matches “{searchQuery.trim()}”.
        </AutocompleteEmpty>
        <AutocompleteList>
          {(item: SearchResult) => (
            <AutocompleteItem
              key={item._id}
              onClick={() => onLink(item._id)}
              value={item}
            >
              <span className="min-w-0 flex-1 truncate" title={item.title}>
                {item.title}
              </span>
              <FeedbackStatusBadge status={item.status} />
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}
