"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@ctrl-ui/react/ui/command";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Check,
  Pencil,
  Plus,
  Tag as TagIcon,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  getRandomTagColor,
  getTagSwatchClass,
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

import { DeleteTagDialog } from "./delete-tag-dialog";

interface Tag {
  _id: Id<"tags">;
  color: string;
  icon?: string;
  name: string;
}

interface TagFilterDropdownProps {
  isAdmin: boolean;
  onTagChange: (tagId: string, checked: boolean) => void;
  organizationId: Id<"organizations">;
  selectedTagIds: string[];
  tags: Tag[];
}

interface TagEditFormProps {
  onClose: () => void;
  onDelete: () => void;
  tag: Tag;
}

function TagEditForm({ tag, onClose, onDelete }: TagEditFormProps) {
  const updateTag = useMutation(api.organizations.tag_manager_actions.update);
  const nameId = useId();
  const errorId = `${nameId}-error`;
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<TagColor>(
    isValidTagColor(tag.color) ? tag.color : migrateHexToNamedColor(tag.color)
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the tag a name.");
      return;
    }
    if (trimmedName === tag.name && color === tag.color) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await updateTag({ color, id: tag._id, name: trimmedName });
      onClose();
    } catch {
      setError("Couldn’t save the tag. Try again.");
    }
    setIsSaving(false);
  };

  return (
    <form className="space-y-3" noValidate onSubmit={handleSubmit}>
      <Field invalid={Boolean(error)}>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          autoFocus
          disabled={isSaving}
          id={nameId}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          size="sm"
          value={name}
        />
        <FieldError id={errorId} match={Boolean(error)}>
          {error}
        </FieldError>
      </Field>

      <NotionColorPicker onChange={setColor} value={color} />

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          disabled={isSaving}
          onClick={onDelete}
          size="xs"
          tone="danger"
          variant="ghost"
        >
          <Trash aria-hidden data-icon="inline-start" />
          Delete
        </Button>
        <div className="flex gap-1">
          <Button
            disabled={isSaving}
            onClick={onClose}
            size="xs"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={isSaving}
            size="xs"
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isSaving && <Spinner data-icon="inline-start" size="xs" />}
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

function TagEditButton({ tag }: { tag: Tag }) {
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          onClick={(e) => e.stopPropagation()}
          render={
            <Button
              aria-label={`Edit ${tag.name}`}
              className="opacity-0 focus-visible:opacity-100 group-hover/command-item:opacity-100 group-data-[selected=true]/command-item:opacity-100"
              iconOnly
              size="xs"
              variant="ghost"
            />
          }
        >
          <Pencil aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-3" side="right">
          <TagEditForm
            onClose={() => setOpen(false)}
            onDelete={() => setShowDeleteDialog(true)}
            tag={tag}
          />
        </PopoverContent>
      </Popover>

      <DeleteTagDialog
        onOpenChange={setShowDeleteDialog}
        onSuccess={() => {
          setShowDeleteDialog(false);
          setOpen(false);
        }}
        tag={showDeleteDialog ? tag : null}
      />
    </>
  );
}

interface TagOptionProps {
  isAdmin: boolean;
  isSelected: boolean;
  onSelect: () => void;
  tag: Tag;
}

function TagOption({ tag, isSelected, isAdmin, onSelect }: TagOptionProps) {
  return (
    <CommandItem
      className="flex items-center gap-2"
      data-checked={isSelected}
      onSelect={onSelect}
      value={tag._id}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border",
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="size-3" weight="bold" />}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          getTagSwatchClass(tag.color)
        )}
      />
      <span className="min-w-0 flex-1 truncate" title={tag.name}>
        {tag.icon && (
          <span aria-hidden="true" className="mr-1">
            {tag.icon}
          </span>
        )}
        {tag.name}
      </span>
      {isAdmin && <TagEditButton tag={tag} />}
    </CommandItem>
  );
}

export function TagFilterDropdown({
  organizationId,
  tags,
  selectedTagIds,
  onTagChange,
  isAdmin,
}: TagFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createTag = useMutation(api.organizations.tag_manager_actions.create);

  const search = searchValue.trim().toLowerCase();
  const filteredTags = search
    ? tags.filter((tag) => tag.name.toLowerCase().includes(search))
    : tags;
  const selectedTagSet = new Set(selectedTagIds);
  const canCreateTag =
    isAdmin &&
    search !== "" &&
    !tags.some((tag) => tag.name.toLowerCase() === search);

  const handleCreateTag = async () => {
    if (!canCreateTag || isCreating) {
      return;
    }
    setIsCreating(true);
    try {
      await createTag({
        color: getRandomTagColor(),
        name: searchValue.trim(),
        organizationId,
      });
      setSearchValue("");
    } catch {
      toast.error("Couldn’t create the tag. Try again.");
    }
    setIsCreating(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button size="sm" variant="surface" />}>
        <TagIcon aria-hidden data-icon="inline-start" />
        Tags
        {selectedTagIds.length > 0 && (
          <Badge className="tabular-nums" size="sm">
            {selectedTagIds.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60" padding="none">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setSearchValue}
            placeholder={isAdmin ? "Search or create tags…" : "Search tags…"}
            value={searchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isAdmin ? "No tags found. Type to create." : "No tags found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredTags.map((tag) => {
                const isSelected = selectedTagSet.has(tag._id);
                return (
                  <TagOption
                    isAdmin={isAdmin}
                    isSelected={isSelected}
                    key={tag._id}
                    onSelect={() => onTagChange(tag._id, !isSelected)}
                    tag={tag}
                  />
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
                    {isCreating ? (
                      <Spinner size="xs" />
                    ) : (
                      <Plus aria-hidden className="size-4" />
                    )}
                    <span className="min-w-0 truncate">
                      Create “{searchValue.trim()}”
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
