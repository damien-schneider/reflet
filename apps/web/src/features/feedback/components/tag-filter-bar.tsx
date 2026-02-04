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
import type { TagColor } from "@/lib/tag-colors";
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

// Tailwind classes for tag colors - using opacity for modern look
const TAG_STYLES: Record<TagColor, { base: string; selected: string }> = {
  default: {
    base: "bg-muted text-neutral-600 dark:text-neutral-400",
    selected: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-300",
  },
  gray: {
    base: "bg-muted text-slate-600 dark:text-slate-400",
    selected: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
  brown: {
    base: "bg-muted text-amber-700 dark:text-amber-400",
    selected: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  orange: {
    base: "bg-muted text-orange-600 dark:text-orange-400",
    selected: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  yellow: {
    base: "bg-muted text-yellow-700 dark:text-yellow-400",
    selected: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  },
  green: {
    base: "bg-muted text-emerald-700 dark:text-emerald-400",
    selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  blue: {
    base: "bg-muted text-blue-600 dark:text-blue-400",
    selected: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  purple: {
    base: "bg-muted text-violet-700 dark:text-violet-400",
    selected: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  pink: {
    base: "bg-muted text-pink-600 dark:text-pink-400",
    selected: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  },
  red: {
    base: "bg-muted text-red-600 dark:text-red-400",
    selected: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
};

function getTagStyles(color: string): { base: string; selected: string } {
  const validColor = isValidTagColor(color) ? color : "default";
  return TAG_STYLES[validColor];
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
  const styles = getTagStyles(tag.color);

  const button = (
    <button
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-medium text-sm transition",
        isSelected ? styles.selected : styles.base
      )}
      onClick={onClick}
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
            "shrink-0 rounded-full px-3 py-1 font-medium text-sm transition",
            isAllSelected
              ? "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300"
              : "bg-muted text-neutral-600 dark:text-neutral-400"
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
