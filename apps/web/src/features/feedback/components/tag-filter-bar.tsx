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
import { TagFormPopover } from "@/features/tags/components/tag-form-popover";
import { TriagePulse } from "./triage-pulse";

export interface Tag {
  _id: Id<"tags">;
  color: string;
  icon?: string;
  name: string;
}

interface TagFilterBarProps {
  isAdmin: boolean;
  onTagSelect: (tagId: string | null) => void;
  organizationId: Id<"organizations">;
  selectedTagId: string | null;
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
      {tag.icon && <span className="mr-1">{tag.icon}</span>}
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
  selectedTagId,
  onTagSelect,
  isAdmin,
}: TagFilterBarProps) {
  const isAllSelected = selectedTagId === null;

  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<Id<"tags"> | null>(null);

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
        className="mx-auto max-w-3xl"
        lockAxis="y"
        viewportClassName="px-4 pt-1 pb-4"
      >
        <div className="flex w-max items-center gap-2">
          {isAdmin && <TriagePulse organizationId={organizationId} />}

          <TagPill
            active={isAllSelected}
            color="gray"
            onClick={() => onTagSelect(null)}
          >
            All
          </TagPill>

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
        onOpenChange={(open) => !open && setDeletingTagId(null)}
        onSuccess={handleDeleteSuccess}
        tagId={deletingTagId}
      />
    </>
  );
}
