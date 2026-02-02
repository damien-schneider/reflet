"use client";

import {
  Funnel as FilterIcon,
  SortAscending as SortAscendingIcon,
  X,
} from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListCheckboxItem,
  DropdownListContent,
  DropdownListGroup,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagFilterDropdown } from "@/features/tags/components/tag-filter-dropdown";

export type SortOption = "votes" | "newest" | "oldest" | "comments";

export interface FiltersBarProps {
  organizationId: Id<"organizations">;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  statuses: Array<{ _id: string; name: string; color: string }>;
  selectedStatusIds: string[];
  onStatusChange: (statusId: string, checked: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onTagChange: (tagId: string, checked: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isAdmin: boolean;
}

export function FiltersBar({
  organizationId,
  sortBy,
  onSortChange,
  statuses,
  selectedStatusIds,
  onStatusChange,
  tags,
  selectedTagIds,
  onTagChange,
  hasActiveFilters,
  onClearFilters,
  isAdmin,
}: FiltersBarProps) {
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

      {statuses.length > 0 && (
        <DropdownList>
          <DropdownListTrigger asChild>
            <Button className="relative" size="icon-sm" variant="outline">
              <FilterIcon />
              {selectedStatusIds.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-olive-600 font-medium text-[10px] text-olive-100">
                  {selectedStatusIds.length}
                </span>
              )}
            </Button>
          </DropdownListTrigger>
          <DropdownListContent align="end" className="w-48">
            <DropdownListGroup>
              <DropdownListLabel>Filter by status</DropdownListLabel>
              <DropdownListSeparator />
              {statuses.map((status) => (
                <DropdownListCheckboxItem
                  checked={selectedStatusIds.includes(status._id)}
                  key={status._id}
                  onCheckedChange={(checked: boolean) =>
                    onStatusChange(status._id, checked)
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </div>
                </DropdownListCheckboxItem>
              ))}
            </DropdownListGroup>
          </DropdownListContent>
        </DropdownList>
      )}

      <TagFilterDropdown
        isAdmin={isAdmin}
        onTagChange={onTagChange}
        organizationId={organizationId}
        selectedTagIds={selectedTagIds}
        tags={tags}
      />

      {hasActiveFilters && (
        <Button onClick={onClearFilters} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
