"use client";

import { Pencil, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { memo, useState } from "react";

import {
  ContextList,
  ContextListContent,
  ContextListItem,
  ContextListSeparator,
  ContextListTrigger,
} from "@/components/ui/context-menu";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag-dialog";
import { TagFormPopover } from "@/features/tags/components/tag-form-popover";
import { isValidTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface Tag {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface TagFilterBarProps {
  organizationId: Id<"organizations">;
  tags: Tag[];
  selectedTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
  isAdmin: boolean;
}

interface TagButtonProps {
  tag: Tag;
  isSelected: boolean;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  onClick: () => void;
  onDelete: () => void;
}

function getTagCssColor(color: string): string {
  const validColor = isValidTagColor(color) ? color : "default";
  return validColor;
}

const TagButton = memo(function TagButton({
  tag,
  isSelected,
  isAdmin,
  organizationId,
  onClick,
  onDelete,
}: TagButtonProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const cssColor = getTagCssColor(tag.color);

  const button = (
    <button
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-medium text-sm transition-all"
      onClick={onClick}
      style={{
        backgroundColor: isSelected
          ? `rgb(var(--tag-${cssColor}-bg))`
          : `rgb(var(--tag-${cssColor}-bg) / 0.4)`,
        color: `rgb(var(--tag-${cssColor}-text))`,
      }}
      type="button"
    >
      {tag.icon && <span>{tag.icon}</span>}
      <span>{tag.name}</span>
    </button>
  );

  if (!isAdmin) {
    return button;
  }

  return (
    <ContextList>
      <ContextListTrigger>
        <TagFormPopover
          disableTriggerClick
          editingTag={tag}
          onOpenChange={setIsEditOpen}
          onSuccess={() => setIsEditOpen(false)}
          open={isEditOpen}
          organizationId={organizationId}
          trigger={button}
        />
      </ContextListTrigger>
      <ContextListContent>
        <ContextListItem onClick={() => setIsEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit tag
        </ContextListItem>
        <ContextListSeparator />
        <ContextListItem onClick={onDelete} variant="destructive">
          <Trash className="mr-2 h-4 w-4" />
          Delete tag
        </ContextListItem>
      </ContextListContent>
    </ContextList>
  );
});

export const TagFilterBar = memo(function TagFilterBar({
  organizationId,
  tags,
  selectedTagId,
  onTagSelect,
  isAdmin,
}: TagFilterBarProps) {
  const isAllSelected = selectedTagId === null;

  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const handleCreateSuccess = () => {
    setShowCreatePopover(false);
  };

  const handleDeleteSuccess = () => {
    if (deletingTagId === selectedTagId) {
      onTagSelect(null);
    }
    setDeletingTagId(null);
  };

  return (
    <>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {/* All button */}
        <button
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 font-medium text-sm transition-all",
            isAllSelected
              ? "bg-foreground text-background"
              : "bg-foreground/10 text-foreground"
          )}
          onClick={() => onTagSelect(null)}
          type="button"
        >
          All
        </button>

        {/* Tag buttons */}
        {tags.map((tag) => (
          <TagButton
            isAdmin={isAdmin}
            isSelected={selectedTagId === tag._id}
            key={tag._id}
            onClick={() =>
              onTagSelect(selectedTagId === tag._id ? null : tag._id)
            }
            onDelete={() => setDeletingTagId(tag._id)}
            organizationId={organizationId}
            tag={tag}
          />
        ))}

        {/* Add tag button (admin only) */}
        {isAdmin && (
          <TagFormPopover
            onOpenChange={setShowCreatePopover}
            onSuccess={handleCreateSuccess}
            open={showCreatePopover}
            organizationId={organizationId}
          />
        )}
      </div>

      {/* Delete tag dialog */}
      <DeleteTagDialog
        onOpenChange={(open) => !open && setDeletingTagId(null)}
        onSuccess={handleDeleteSuccess}
        tagId={deletingTagId}
      />
    </>
  );
});
