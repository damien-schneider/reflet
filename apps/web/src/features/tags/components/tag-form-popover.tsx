"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

interface TagFormPopoverProps {
  /** When true, the trigger won't open the popover on click (use for context menu controlled popovers) */
  disableTriggerClick?: boolean;
  editingTag?: {
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  organizationId: Id<"organizations">;
  trigger?: ReactNode;
}

export function TagFormPopover({
  editingTag = null,
  ...props
}: TagFormPopoverProps) {
  return (
    <TagFormPopoverContent
      editingTag={editingTag}
      key={getTagFormKey(editingTag)}
      {...props}
    />
  );
}

type EditableTag = NonNullable<TagFormPopoverProps["editingTag"]>;
type TagFormPopoverContentProps = Omit<TagFormPopoverProps, "editingTag"> & {
  editingTag: EditableTag | null;
};

interface TagFormData {
  color: TagColor;
  icon?: string;
  name: string;
}

const getTagFormData = (editingTag: EditableTag | null): TagFormData => {
  if (!editingTag) {
    return {
      name: "",
      color: "blue",
      icon: undefined,
    };
  }

  const color = isValidTagColor(editingTag.color)
    ? editingTag.color
    : migrateHexToNamedColor(editingTag.color);

  return {
    name: editingTag.name,
    color,
    icon: editingTag.icon,
  };
};

const getTagFormKey = (editingTag: EditableTag | null): string => {
  if (!editingTag) {
    return "create";
  }
  return `${editingTag._id}:${editingTag.name}:${editingTag.color}:${editingTag.icon ?? ""}`;
};

function TagFormPopoverContent({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
  trigger,
  disableTriggerClick = false,
}: TagFormPopoverContentProps) {
  const createTag = useMutation(api.organizations.tag_manager_actions.create);
  const updateTag = useMutation(api.organizations.tag_manager_actions.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TagFormData>(() =>
    getTagFormData(editingTag)
  );

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTag) {
        await updateTag({
          id: editingTag._id,
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      } else {
        await createTag({
          organizationId,
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      }
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const popoverForm = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <EmojiPicker
          onChange={(icon) => setFormData((current) => ({ ...current, icon }))}
          value={formData.icon}
        />
        <Input
          className="h-8 flex-1"
          onChange={(e) =>
            setFormData((current) => ({
              ...current,
              name: e.target.value,
            }))
          }
          onKeyDown={handleKeyDown}
          placeholder="Tag name..."
          value={formData.name}
        />
      </div>
      <NotionColorPicker
        onChange={(color) => setFormData((current) => ({ ...current, color }))}
        value={formData.color}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button
          className="h-7 text-xs"
          onClick={() => onOpenChange(false)}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="h-7 text-xs"
          disabled={isSubmitting || !formData.name.trim()}
          onClick={handleSubmit}
          size="sm"
        >
          {isSubmitting ? "Saving..." : ""}
          {!isSubmitting && editingTag ? "Save" : ""}
          {isSubmitting || editingTag ? "" : "Create"}
        </Button>
      </div>
    </div>
  );

  // When disableTriggerClick is true, wrap in a span that stops click propagation
  // This is controlled externally (e.g., by context menu) so we intentionally block trigger clicks
  if (disableTriggerClick && trigger) {
    return (
      <Popover onOpenChange={onOpenChange} open={open}>
        <PopoverTrigger
          nativeButton={false}
          render={(
            props: React.HTMLAttributes<HTMLElement> & {
              ref?: React.Ref<HTMLElement>;
            }
          ) => {
            // Strip click/keyboard handlers to prevent the popover from opening
            // on trigger interaction — the popover is controlled externally
            const { onClick: _click, onKeyDown: _keyDown, ...rest } = props;
            return <span {...rest}>{trigger}</span>;
          }}
        />
        <PopoverContent align="start" className="w-[280px] p-3">
          {popoverForm}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger
        render={(
          props: React.HTMLAttributes<HTMLElement> & {
            ref?: React.Ref<HTMLButtonElement>;
          }
        ) => (
          <button
            {...props}
            aria-label="Add tag"
            className="flex shrink-0 items-center justify-center rounded-full bg-muted px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            type="button"
          >
            <Plus className="size-4" />
          </button>
        )}
      />
      <PopoverContent align="start" className="w-[280px] p-3">
        {popoverForm}
      </PopoverContent>
    </Popover>
  );
}
