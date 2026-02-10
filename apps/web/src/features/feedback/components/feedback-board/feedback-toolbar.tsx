import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
  X,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BoardView as BoardViewType } from "../board-view-toggle";
import type { Tag } from "../tag-filter-bar";
import { TagFilterBar } from "../tag-filter-bar";

interface StatusItem {
  _id: Id<"organizationStatuses">;
  name: string;
  color?: string;
}

interface FeedbackToolbarProps {
  view: BoardViewType;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSubmitClick: () => void;
  tags: Tag[];
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  selectedTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
  selectedStatusIds: string[];
  statuses: StatusItem[];
  onStatusRemove: (statusId: string, checked: boolean) => void;
  onClearFilters: () => void;
}

export const FeedbackToolbar = ({
  view,
  searchQuery,
  onSearchChange,
  onSubmitClick,
  tags,
  isAdmin,
  organizationId,
  selectedTagId,
  onTagSelect,
  selectedStatusIds,
  statuses,
  onStatusRemove,
  onClearFilters,
}: FeedbackToolbarProps) => (
  <>
    {/* Toolbar area */}
    <div className={cn("mx-auto max-w-6xl px-4 pb-4")}>
      <div className="flex min-w-0 items-center gap-4">
        {/* Search bar */}
        <div className="relative w-48 flex-shrink-0">
          <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-full border-0 bg-muted pr-4 pl-10 focus-visible:ring-2"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            value={searchQuery}
          />
        </div>
      </div>
    </div>

    {/* Submit Feedback - fixed bottom right */}
    <div className="fixed right-4 bottom-4 z-50 md:right-8 md:bottom-8">
      <Button
        className="h-12 rounded-full shadow-lg"
        onClick={onSubmitClick}
        size="lg"
      >
        <Plus className="h-4 w-4" />
        Submit Feedback
      </Button>
    </div>

    {/* Tag filter bar */}
    {(tags.length > 0 || isAdmin) && (
      <div>
        <TagFilterBar
          isAdmin={isAdmin}
          onTagSelect={onTagSelect}
          organizationId={organizationId}
          selectedTagId={selectedTagId}
          tags={tags}
        />
      </div>
    )}

    {/* Active status filter chips (only in feed view) */}
    {view === "feed" && selectedStatusIds.length > 0 && (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Status:</span>
        {selectedStatusIds.map((statusId) => {
          const status = statuses.find((s) => s._id === statusId);
          if (!status) {
            return null;
          }
          return (
            <Badge
              className="cursor-pointer gap-1 pr-1"
              color={status.color}
              key={statusId}
              onClick={() => onStatusRemove(statusId, false)}
            >
              {status.name}
              <X className="h-3 w-3" />
            </Badge>
          );
        })}
        <Button
          className="text-xs"
          onClick={onClearFilters}
          size="sm"
          variant="ghost"
        >
          Clear
        </Button>
      </div>
    )}
  </>
);
