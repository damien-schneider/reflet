"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Funnel } from "@phosphor-icons/react";
import { getTagDotColor } from "@/lib/tag-colors";

interface FilterDropdownProps {
  hideCompleted: boolean;
  onClearFilters: () => void;
  onHideCompletedToggle: () => void;
  onStatusChange: (id: string, checked: boolean) => void;
  onTagChange: (id: string, checked: boolean) => void;
  selectedStatusIds: string[];
  selectedTagIds: string[];
  statuses: Array<{ _id: string; name: string; color?: string }>;
  tags: Array<{ _id: string; name: string; color: string }>;
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            tone={activeCount > 0 ? "primary" : "neutral"}
            variant="surface"
          >
            <Funnel data-icon="inline-start" />
            Filter
            {activeCount > 0 && (
              <Badge
                className="ml-1 h-4 min-w-4 px-1 text-micro"
                variant="default"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {/* Status submenu */}
        {statuses.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statuses.map((status) => (
                <DropdownMenuCheckboxItem
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
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Tag submenu */}
        {tags.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Tag</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  checked={selectedTagIds.includes(tag._id)}
                  key={tag._id}
                  onCheckedChange={(checked) => onTagChange(tag._id, checked)}
                >
                  <span
                    className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getTagDotColor(tag.color) }}
                  />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        {/* Show completed toggle */}
        <DropdownMenuCheckboxItem
          checked={!hideCompleted}
          onCheckedChange={onHideCompletedToggle}
        >
          Show completed
        </DropdownMenuCheckboxItem>

        {/* Clear all filters */}
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-muted-foreground text-xs"
              onClick={onClearFilters}
            >
              Clear all filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
