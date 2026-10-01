"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@ctrl-ui/react/ui/context-menu";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Pencil, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { TagPill } from "@/components/tag-pill";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag-dialog";
import type { EditableTag } from "@/features/tags/components/editor/form-state";
import { TagFormPopover } from "@/features/tags/components/editor/tag-form-popover";
import { TriagePulse } from "./triage-pulse";

export type Tag = EditableTag;

interface TagFilterBarProps {
  isAdmin: boolean;
  onClearTags: () => void;
  onTagChange: (id: string, checked: boolean) => void;
  organizationId: Id<"organizations">;
  selectedTagIds: string[];
  tags: Tag[];
}

interface TagButtonProps {
  isAdmin: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  organizationId: Id<"organizations">;
  tag: Tag;
}

function TagButton({
  tag,
  isSelected,
  isAdmin,
  organizationId,
  onClick,
  onDelete,
}: TagButtonProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const button = (
    <TagPill active={isSelected} color={tag.color} onClick={onClick}>
      {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
      {tag.name}
    </TagPill>
  );

  if (!isAdmin) {
    return button;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <TagFormPopover
          disableTriggerClick
          editingTag={tag}
          onOpenChange={setIsEditOpen}
          onSuccess={() => setIsEditOpen(false)}
          open={isEditOpen}
          organizationId={organizationId}
          trigger={button}
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setIsEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit tag
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="menu-item-danger" onClick={onDelete}>
          <Trash className="mr-2 h-4 w-4" />
          Delete tag
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function TagFilterBar({
  organizationId,
  tags,
  selectedTagIds,
  onTagChange,
  onClearTags,
  isAdmin,
}: TagFilterBarProps) {
  const selectedTags = new Set(selectedTagIds);
  const isAllSelected = selectedTagIds.length === 0;

  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  const handleCreateSuccess = () => {
    setShowCreatePopover(false);
  };

  const handleDeleteSuccess = () => {
    if (deletingTag && selectedTags.has(deletingTag._id)) {
      onTagChange(deletingTag._id, false);
    }
    setDeletingTag(null);
  };

  return (
    <>
      <ScrollArea
        className="mx-auto max-w-3xl"
        lockAxis="y"
        viewportClassName="px-4 pt-1 pb-4"
      >
        <div className="flex w-max items-center gap-2">
          {isAdmin && <TriagePulse organizationId={organizationId} />}

          <TagPill active={isAllSelected} onClick={onClearTags}>
            All
          </TagPill>

          {tags.map((tag) => (
            <TagButton
              isAdmin={isAdmin}
              isSelected={selectedTags.has(tag._id)}
              key={tag._id}
              onClick={() => onTagChange(tag._id, !selectedTags.has(tag._id))}
              onDelete={() => setDeletingTag(tag)}
              organizationId={organizationId}
              tag={tag}
            />
          ))}

          {isAdmin && (
            <TagFormPopover
              onOpenChange={setShowCreatePopover}
              onSuccess={handleCreateSuccess}
              open={showCreatePopover}
              organizationId={organizationId}
            />
          )}
        </div>
      </ScrollArea>

      <DeleteTagDialog
        onOpenChange={(open) => !open && setDeletingTag(null)}
        onSuccess={handleDeleteSuccess}
        tag={deletingTag}
      />
    </>
  );
}
