import {
  MagnifyingGlass as MagnifyingGlassIcon,
  Plus,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InlineFeedbackInputHandle } from "../inline-feedback-input";
import type { Tag } from "../tag-filter-bar";
import { TagFilterBar } from "../tag-filter-bar";

interface FeedbackToolbarProps {
  inlineInputRef?: RefObject<InlineFeedbackInputHandle | null>;
  isAdmin: boolean;
  onSearchChange: (value: string) => void;
  onSubmitClick: () => void;
  onTagSelect: (tagId: string | null) => void;
  organizationId: Id<"organizations">;
  searchQuery: string;
  selectedTagId: string | null;
  showSearch: boolean;
  tags: Tag[];
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
  inlineInputRef,
  showSearch,
}: FeedbackToolbarProps) => (
  <>
    {showSearch && (
      <div className="mx-auto max-w-3xl px-4 pb-3">
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-full border-0 bg-muted pr-4 pl-10 focus-visible:ring-2"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search feedback"
            value={searchQuery}
          />
        </div>
      </div>
    )}

    {!inlineInputRef && (
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
    )}

    {(tags.length > 0 || isAdmin) && (
      <TagFilterBar
        isAdmin={isAdmin}
        onTagSelect={onTagSelect}
        organizationId={organizationId}
        selectedTagId={selectedTagId}
        tags={tags}
      />
    )}
  </>
);
