"use client";

import { Pencil, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { memo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ContextList,
  ContextListContent,
  ContextListItem,
  ContextListSeparator,
  ContextListTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag-dialog";
import { TagFormPopover } from "@/features/tags/components/tag-form-popover";

export interface Tag {
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

const TagButton = memo(function TagButton({
  tag,
  isSelected,
  isAdmin,
  organizationId,
  onClick,
  onDelete,
}: TagButtonProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const button = (
    <Button
      active={isSelected}
      color={tag.color}
      onClick={onClick}
      size="pill"
      variant="pill"
    >
      {tag.icon && <span className="mr-1">{tag.icon}</span>}
      {tag.name}
    </Button>
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
      <ScrollArea
        className="mx-auto max-w-6xl"
        classNameViewport="flex gap-2 pb-5 pt-1 px-4"
      >
        {/* All button */}
        <Button
          active={isAllSelected}
          color="gray"
          onClick={() => onTagSelect(null)}
          size="pill"
          variant="pill"
        >
          All
        </Button>

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
      </ScrollArea>

      {/* Delete tag dialog */}
      <DeleteTagDialog
        onOpenChange={(open) => !open && setDeletingTagId(null)}
        onSuccess={handleDeleteSuccess}
        tagId={deletingTagId}
      />
    </>
  );
});
