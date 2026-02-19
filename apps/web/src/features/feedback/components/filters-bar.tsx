"use client";

import { SortAscending as SortAscendingIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  votes: "Most Votes",
  newest: "Newest",
  oldest: "Oldest",
  comments: "Most Comments",
};

export interface FiltersBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  hideCompleted: boolean;
  onHideCompletedToggle: () => void;
  statuses: Array<{ _id: string; name: string; color?: string }>;
  selectedStatusIds: string[];
  onStatusChange: (id: string, checked: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onTagChange: (id: string, checked: boolean) => void;
  onClearFilters: () => void;
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
  return (
    <div className="mx-auto mb-6 max-w-6xl px-4">
      <div className="flex items-center justify-between gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost">
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
              <DropdownMenuRadioItem value="votes">
                Most Votes
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">
                Newest
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">
                Oldest
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="comments">
                Most Comments
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
