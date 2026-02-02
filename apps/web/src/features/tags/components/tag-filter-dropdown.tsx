"use client";

import {
  Check,
  Pencil,
  Plus,
  Tag as TagIcon,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { memo, useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COLOR_PALETTE } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { DeleteTagDialog } from "./delete-tag-dialog";

interface Tag {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface TagFilterDropdownProps {
  organizationId: Id<"organizations">;
  tags: Tag[];
  selectedTagIds: string[];
  onTagChange: (tagId: string, checked: boolean) => void;
  isAdmin: boolean;
}

function getRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

interface TagEditButtonProps {
  tag: Tag;
}

const TagEditButton = memo(function TagEditButton({ tag }: TagEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [editedName, setEditedName] = useState(tag.name);
  const [editedColor, setEditedColor] = useState(tag.color);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateTag = useMutation(api.tag_manager_actions.update);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        setEditedName(tag.name);
        setEditedColor(tag.color);
      }
    },
    [tag.name, tag.color]
  );

  const handleSave = useCallback(async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setOpen(false);
      return;
    }

    const hasNameChanged = trimmedName !== tag.name;
    const hasColorChanged = editedColor !== tag.color;

    if (hasNameChanged || hasColorChanged) {
      await updateTag({
        id: tag._id as Id<"tags">,
        name: trimmedName,
        color: editedColor,
      });
    }
    setOpen(false);
  }, [editedName, editedColor, tag._id, tag.name, tag.color, updateTag]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [handleSave]
  );

  const handleDeleteSuccess = useCallback(() => {
    setShowDeleteDialog(false);
    setOpen(false);
  }, []);

  return (
    <>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger
          className="flex h-5 w-5 items-center justify-center rounded opacity-0 hover:bg-accent hover:opacity-100 group-data-[selected=true]/command-item:opacity-100"
          onClick={(e) => e.stopPropagation()}
          render={(props) => <button {...props} type="button" />}
        >
          <Pencil className="h-3 w-3" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-3" side="right">
          <div className="space-y-3">
            <Input
              autoFocus
              className="h-8"
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tag name"
              value={editedName}
            />

            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PALETTE.map((paletteColor) => (
                <button
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    paletteColor === editedColor &&
                      "ring-2 ring-primary ring-offset-2"
                  )}
                  key={paletteColor}
                  onClick={() => setEditedColor(paletteColor)}
                  style={{ backgroundColor: paletteColor }}
                  type="button"
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                size="sm"
                variant="ghost"
              >
                <Trash className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
              <div className="flex gap-1">
                <Button
                  className="h-7"
                  onClick={() => setOpen(false)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button className="h-7" onClick={handleSave} size="sm">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DeleteTagDialog
        onOpenChange={setShowDeleteDialog}
        onSuccess={handleDeleteSuccess}
        tagId={showDeleteDialog ? tag._id : null}
      />
    </>
  );
});

export const TagFilterDropdown = memo(function TagFilterDropdown({
  organizationId,
  tags,
  selectedTagIds,
  onTagChange,
  isAdmin,
}: TagFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createTag = useMutation(api.tag_manager_actions.create);

  const filteredTags = useMemo(() => {
    if (!searchValue.trim()) {
      return tags;
    }
    const search = searchValue.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(search));
  }, [tags, searchValue]);

  const canCreateTag = useMemo(() => {
    if (!(isAdmin && searchValue.trim())) {
      return false;
    }
    const search = searchValue.toLowerCase().trim();
    return !tags.some((tag) => tag.name.toLowerCase() === search);
  }, [isAdmin, searchValue, tags]);

  const handleCreateTag = useCallback(async () => {
    if (!canCreateTag || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      await createTag({
        organizationId,
        name: searchValue.trim(),
        color: getRandomColor(),
      });
      setSearchValue("");
    } finally {
      setIsCreating(false);
    }
  }, [canCreateTag, isCreating, createTag, organizationId, searchValue]);

  const handleTagSelect = useCallback(
    (tagId: string) => {
      const isSelected = selectedTagIds.includes(tagId);
      onTagChange(tagId, !isSelected);
    },
    [selectedTagIds, onTagChange]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground"
        render={(props) => <button {...props} type="button" />}
      >
        <TagIcon className="h-4 w-4" />
        Tags
        {selectedTagIds.length > 0 && (
          <Badge className="ml-1" variant="secondary">
            {selectedTagIds.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearchValue}
            placeholder="Search or create tags..."
            value={searchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isAdmin ? (
                <span className="text-muted-foreground">
                  No tags found. Type to create.
                </span>
              ) : (
                <span className="text-muted-foreground">No tags found.</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag._id);

                return (
                  <CommandItem
                    className="flex items-center gap-2"
                    data-checked={isSelected}
                    key={tag._id}
                    onSelect={() => handleTagSelect(tag._id)}
                    value={tag._id}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">
                      {tag.icon && <span className="mr-1">{tag.icon}</span>}
                      {tag.name}
                    </span>
                    {isAdmin && <TagEditButton tag={tag} />}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {canCreateTag && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    className="flex items-center gap-2"
                    disabled={isCreating}
                    onSelect={handleCreateTag}
                    value={`create-${searchValue}`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create &quot;{searchValue.trim()}&quot;</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
