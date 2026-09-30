import { Button } from "@ctrl-ui/react/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ctrl-ui/react/ui/input-group";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { RefObject } from "react";
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
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <MagnifyingGlass
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search feedback"
            autoComplete="off"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search feedback…"
            spellCheck={false}
            type="search"
            value={searchQuery}
          />
        </InputGroup>
      </div>
    )}

    {!inlineInputRef && (
      <div className="fixed right-4 bottom-[calc(var(--mobile-nav-offset,env(safe-area-inset-bottom))+4.25rem)] z-50 md:right-8 md:bottom-8">
        <Button
          className="shadow-(--reflet-popup-shadow)"
          onClick={onSubmitClick}
          size="lg"
          tone="primary"
          variant="solid"
        >
          <Plus data-icon="inline-start" />
          Submit feedback
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
