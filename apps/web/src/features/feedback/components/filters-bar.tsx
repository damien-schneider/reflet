"use client";

import { SortAscending as SortAscendingIcon } from "@phosphor-icons/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "votes" | "newest" | "oldest" | "comments";

export interface FiltersBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function FiltersBar({ sortBy, onSortChange }: FiltersBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        onValueChange={(v) => onSortChange(v as SortOption)}
        value={sortBy}
      >
        <SelectTrigger className="w-40">
          <SortAscendingIcon className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="votes">Most Votes</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="comments">Most Comments</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
