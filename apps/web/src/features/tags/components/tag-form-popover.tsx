"use client";

import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type React from "react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
  organizationId: Id<"organizations">;
  editingTag?: {
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trigger?: ReactNode;
  /** When true, the trigger won't open the popover on click (use for context menu controlled popovers) */
  disableTriggerClick?: boolean;
}

export function TagFormPopover({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
  trigger,
  disableTriggerClick = false,
}: TagFormPopoverProps) {
  const createTag = useMutation(api.tag_manager_actions.create);
  const updateTag = useMutation(api.tag_manager_actions.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    color: TagColor;
    icon?: string;
  }>({
    name: "",
    color: "blue",
    icon: undefined,
  });

  useEffect(() => {
    if (editingTag) {
      const color = isValidTagColor(editingTag.color)
        ? editingTag.color
        : migrateHexToNamedColor(editingTag.color);
      setFormData({
        name: editingTag.name,
        color,
        icon: editingTag.icon,
      });
    } else {
      setFormData({
        name: "",
        color: "blue",
        icon: undefined,
      });
    }
  }, [editingTag]);

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
          onChange={(icon) => setFormData({ ...formData, icon })}
          value={formData.icon}
        />
        <Input
          autoFocus
          className="h-8 flex-1"
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Tag name..."
          value={formData.name}
        />
      </div>
      <NotionColorPicker
        onChange={(color) => setFormData({ ...formData, color })}
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
            <Plus className="h-4 w-4" />
          </button>
        )}
      />
      <PopoverContent align="start" className="w-[280px] p-3">
        {popoverForm}
      </PopoverContent>
    </Popover>
  );
}
