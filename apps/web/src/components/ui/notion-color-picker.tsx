"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Check } from "@phosphor-icons/react";
import { useId } from "react";
import {
  getTagSwatchClass,
  TAG_COLOR_LABELS,
  TAG_COLORS,
  type TagColor,
} from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface NotionColorPickerProps {
  onChange: (color: TagColor) => void;
  value: TagColor;
}

export function NotionColorPicker({ value, onChange }: NotionColorPickerProps) {
  const headingId = useId();

  return (
    <div className="space-y-1">
      <p className="px-1 text-muted-foreground text-xs" id={headingId}>
        Colors
      </p>
      <div aria-labelledby={headingId} className="space-y-0.5" role="group">
        {TAG_COLORS.map((color) => {
          const selected = value === color;

          return (
            <Button
              active={selected}
              aria-pressed={selected}
              className="w-full justify-start"
              key={color}
              onClick={() => onChange(color)}
              size="sm"
              variant="ghost"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 rounded-sm border",
                  getTagSwatchClass(color)
                )}
              />
              <span className="flex-1 text-start">
                {TAG_COLOR_LABELS[color]}
              </span>
              {selected ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
