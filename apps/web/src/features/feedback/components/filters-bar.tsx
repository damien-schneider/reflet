"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { SortAscending as SortAscendingIcon } from "@phosphor-icons/react";
import { countActiveFilters } from "./feedback-board/count-active-filters";
import { FilterDropdown } from "./feedback-board/filter-dropdown";

export type SortOption = "votes" | "newest" | "oldest" | "comments";

const SORT_OPTIONS: readonly SortOption[] = [
  "votes",
  "newest",
  "oldest",
  "comments",
] as const;

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((o) => o === value);

const sortLabels: Record<SortOption, string> = {
  comments: "Most comments",
  newest: "Newest",
  oldest: "Oldest",
  votes: "Most votes",
};

export interface FiltersBarProps {
  hideCompleted: boolean;
  onClearFilters: () => void;
  onHideCompletedToggle: () => void;
  onSortChange: (sort: SortOption) => void;
  onStatusChange: (id: string, checked: boolean) => void;
  onTagChange: (id: string, checked: boolean) => void;
  selectedStatusIds: string[];
  selectedTagIds: string[];
  sortBy: SortOption;
  statuses: Array<{ _id: string; name: string; color?: string }>;
  tags: Array<{ _id: string; name: string; color: string }>;
}

export function FiltersBar({
  sortBy,
  onSortChange,
  hideCompleted,
  onHideCompletedToggle,
  statuses,
  selectedStatusIds,
  onStatusChange,
  tags,
  selectedTagIds,
  onTagChange,
  onClearFilters,
}: FiltersBarProps) {
  const hasActiveFilters =
    countActiveFilters({ hideCompleted, selectedStatusIds, selectedTagIds }) >
    0;

  return (
    <div className="mx-auto mb-4 max-w-3xl px-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <FilterDropdown
            hideCompleted={hideCompleted}
            onClearFilters={onClearFilters}
            onHideCompletedToggle={onHideCompletedToggle}
            onStatusChange={onStatusChange}
            onTagChange={onTagChange}
            selectedStatusIds={selectedStatusIds}
            selectedTagIds={selectedTagIds}
            statuses={statuses}
            tags={tags}
          />
          {hasActiveFilters && (
            <Button onClick={onClearFilters} size="sm" variant="ghost">
              Clear
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Sort: ${sortLabels[sortBy]}`}
                size="sm"
                variant="ghost"
              >
                <SortAscendingIcon data-icon="inline-start" />
                {sortLabels[sortBy]}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              onValueChange={(v) => {
                if (isSortOption(v)) {
                  onSortChange(v);
                }
              }}
              value={sortBy}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {sortLabels[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
