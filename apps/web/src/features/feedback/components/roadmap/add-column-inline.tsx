"use client";

import { Check, Plus, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getTagDotColor, type TagColor } from "@/lib/tag-colors";

interface AddColumnInlineProps {
  organizationId: Id<"organizations">;
}

export function AddColumnInline({ organizationId }: AddColumnInlineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createStatus = useMutation(api.organization_statuses.create);

  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
    setName("");
    setColor("blue");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setName("");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      handleCancel();
      return;
    }

    await createStatus({
      organizationId,
      name: trimmedName,
      color,
    });

    setIsAdding(false);
    setName("");
  }, [name, color, organizationId, createStatus, handleCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!isAdding) {
    return (
      <div className="w-72 shrink-0">
        <Button
          className="h-full min-h-[200px] w-full border-2 border-dashed"
          onClick={handleStartAdding}
          variant="ghost"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Column
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        {/* Color picker */}
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <PopoverTrigger
            className="h-3 w-3 shrink-0 rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: getTagDotColor(color) }}
            title="Choose color"
          />
          <PopoverContent align="start" className="w-[200px] p-2">
            <NotionColorPicker
              onChange={(newColor) => {
                setColor(newColor);
                setIsColorPickerOpen(false);
              }}
              value={color}
            />
          </PopoverContent>
        </Popover>

        {/* Name input */}
        <Input
          className="h-7 flex-1 px-2 py-1 text-sm"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Column name..."
          ref={inputRef}
          value={name}
        />

        {/* Action buttons */}
        <Button
          className="h-6 w-6"
          onClick={handleSave}
          size="icon"
          variant="ghost"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          className="h-6 w-6"
          onClick={handleCancel}
          size="icon"
          variant="ghost"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="py-8 text-center text-muted-foreground text-sm">
        Enter column name and press Enter
      </div>
    </div>
  );
}
