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
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { countActiveFilters } from "./count-active-filters";

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

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mr-1.5 inline-block size-2 shrink-0 rounded-full",
        getTagSwatchClass(color)
      )}
    />
  );
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
  const activeCount = countActiveFilters({
    hideCompleted,
    selectedStatusIds,
    selectedTagIds,
  });
  const selectedStatusSet = new Set<string>(selectedStatusIds);
  const selectedTagSet = new Set<string>(selectedTagIds);

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
              <>
                <Badge className="tabular-nums" size="sm">
                  {activeCount}
                </Badge>
                <span className="sr-only">active</span>
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {statuses.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statuses.map((status) => (
                <DropdownMenuCheckboxItem
                  checked={selectedStatusSet.has(status._id)}
                  key={status._id}
                  onCheckedChange={(checked) =>
                    onStatusChange(status._id, checked)
                  }
                >
                  <Swatch color={status.color ?? "default"} />
                  {status.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {tags.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Tag</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  checked={selectedTagSet.has(tag._id)}
                  key={tag._id}
                  onCheckedChange={(checked) => onTagChange(tag._id, checked)}
                >
                  <Swatch color={tag.color} />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={!hideCompleted}
          onCheckedChange={onHideCompletedToggle}
        >
          Show completed
        </DropdownMenuCheckboxItem>

        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearFilters}>
              Clear all filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
