"use client";

import { Funnel } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListCheckboxItem,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListSub,
  DropdownListSubContent,
  DropdownListSubTrigger,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { getTagDotColor } from "@/lib/tag-colors";

interface FilterDropdownProps {
  statuses: Array<{ _id: string; name: string; color?: string }>;
  selectedStatusIds: string[];
  onStatusChange: (id: string, checked: boolean) => void;
  tags: Array<{ _id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onTagChange: (id: string, checked: boolean) => void;
  hideCompleted: boolean;
  onHideCompletedToggle: () => void;
  onClearFilters: () => void;
}

export function FilterDropdown({
  statuses,
  selectedStatusIds,
  onStatusChange,
  tags,
  selectedTagIds,
  onTagChange,
  hideCompleted,
  onHideCompletedToggle,
  onClearFilters,
}: FilterDropdownProps) {
  const activeCount =
    selectedStatusIds.length + selectedTagIds.length + (hideCompleted ? 1 : 0);

  return (
    <DropdownList>
      <DropdownListTrigger
        render={
          <Button size="sm" variant={activeCount > 0 ? "secondary" : "outline"}>
            <Funnel data-icon="inline-start" />
            Filter
            {activeCount > 0 && (
              <Badge
                className="ml-1 h-4 min-w-4 px-1 text-[10px]"
                variant="default"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownListContent align="start">
        {/* Status submenu */}
        {statuses.length > 0 && (
          <DropdownListSub>
            <DropdownListSubTrigger>Status</DropdownListSubTrigger>
            <DropdownListSubContent>
              {statuses.map((status) => (
                <DropdownListCheckboxItem
                  checked={selectedStatusIds.includes(status._id)}
                  key={status._id}
                  onCheckedChange={(checked) =>
                    onStatusChange(status._id, checked)
                  }
                >
                  <span
                    className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: getTagDotColor(
                        status.color ?? "default"
                      ),
                    }}
                  />
                  {status.name}
                </DropdownListCheckboxItem>
              ))}
            </DropdownListSubContent>
          </DropdownListSub>
        )}

        {/* Tag submenu */}
        {tags.length > 0 && (
          <DropdownListSub>
            <DropdownListSubTrigger>Tag</DropdownListSubTrigger>
            <DropdownListSubContent>
              {tags.map((tag) => (
                <DropdownListCheckboxItem
                  checked={selectedTagIds.includes(tag._id)}
                  key={tag._id}
                  onCheckedChange={(checked) => onTagChange(tag._id, checked)}
                >
                  <span
                    className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getTagDotColor(tag.color) }}
                  />
                  {tag.name}
                </DropdownListCheckboxItem>
              ))}
            </DropdownListSubContent>
          </DropdownListSub>
        )}

        <DropdownListSeparator />

        {/* Show completed toggle */}
        <DropdownListCheckboxItem
          checked={!hideCompleted}
          onCheckedChange={onHideCompletedToggle}
        >
          Show completed
        </DropdownListCheckboxItem>

        {/* Clear all filters */}
        {activeCount > 0 && (
          <>
            <DropdownListSeparator />
            <DropdownListItem
              className="text-muted-foreground text-xs"
              onClick={onClearFilters}
            >
              Clear all filters
            </DropdownListItem>
          </>
        )}
      </DropdownListContent>
    </DropdownList>
  );
}
