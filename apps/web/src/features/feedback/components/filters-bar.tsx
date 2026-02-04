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

export type SortOption = "votes" | "newest" | "oldest" | "comments";

const sortLabels: Record<SortOption, string> = {
  votes: "Most Votes",
  newest: "Newest",
  oldest: "Oldest",
  comments: "Most Comments",
};

export interface FiltersBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function FiltersBar({ sortBy, onSortChange }: FiltersBarProps) {
  return (
    <div className="mx-auto mb-6 flex max-w-6xl items-center justify-end px-4">
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
            onValueChange={(v) => onSortChange(v as SortOption)}
            value={sortBy}
          >
            <DropdownMenuRadioItem value="votes">
              Most Votes
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="comments">
              Most Comments
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
