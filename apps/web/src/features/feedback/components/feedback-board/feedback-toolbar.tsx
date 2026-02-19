import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tag } from "../tag-filter-bar";
import { TagFilterBar } from "../tag-filter-bar";

interface FeedbackToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSubmitClick: () => void;
  tags: Tag[];
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  selectedTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
}

export const FeedbackToolbar = ({
  searchQuery,
  onSearchChange,
  onSubmitClick,
  tags,
  isAdmin,
  organizationId,
  selectedTagId,
  onTagSelect,
}: FeedbackToolbarProps) => (
  <>
    {/* Toolbar area */}
    <div className="mx-auto max-w-6xl px-4 pb-4">
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
  </>
);
