"use client";

import { Check } from "@phosphor-icons/react";
import {
  getTagSwatchClass,
  TAG_COLOR_LABELS,
  TAG_COLORS,
  type TagColor,
} from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface NotionColorPickerProps {
  value: TagColor;
  onChange: (color: TagColor) => void;
}

export function NotionColorPicker({ value, onChange }: NotionColorPickerProps) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-muted-foreground text-xs">Colors</p>
      <div className="space-y-0.5">
        {TAG_COLORS.map((color) => (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
              value === color && "bg-accent"
            )}
            key={color}
            onClick={() => onChange(color)}
            type="button"
          >
            <div
              className={cn(
                "h-4 w-4 rounded-sm border",
                getTagSwatchClass(color)
              )}
            />
            <span className="flex-1 text-left">{TAG_COLOR_LABELS[color]}</span>
            {value === color && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}
