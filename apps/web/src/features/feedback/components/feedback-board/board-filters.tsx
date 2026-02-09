"use client";

import {
  Funnel as FilterIcon,
  SortAscending as SortAscendingIcon,
  X,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
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
import { getTagDotColor } from "@/lib/tag-colors";

import type { FiltersBarProps } from "./types";
import { SORT_OPTIONS } from "./types";

export function BoardFilters({
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
        onValueChange={(v) => onSortChange(v as typeof sortBy)}
        value={sortBy}
      >
        <SelectTrigger className="w-40">
          <SortAscendingIcon className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {statuses.length > 0 && (
        <DropdownList>
          <DropdownListTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground">
            <FilterIcon className="h-4 w-4" />
            Status
            {selectedStatusIds.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {selectedStatusIds.length}
              </Badge>
            )}
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
                      style={{ backgroundColor: getTagDotColor(status.color) }}
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
