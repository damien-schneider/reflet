"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check } from "@phosphor-icons/react";
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
  return (
    <div className="space-y-1">
      <p className="px-1 text-muted-foreground text-xs" id="tag-color-heading">
        Colors
      </p>
      <div
        aria-labelledby="tag-color-heading"
        className="space-y-0.5"
        role="group"
      >
        {TAG_COLORS.map((color) => {
          const label = TAG_COLOR_LABELS[color];
          const selected = value === color;

          return (
            <Tooltip key={color}>
              <TooltipTrigger
                aria-label={label}
                aria-pressed={selected}
                render={
                  <Button
                    active={selected}
                    className="w-full justify-start gap-2 px-2"
                    onClick={() => onChange(color)}
                    size="sm"
                    variant="ghost"
                  />
                }
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-sm border",
                    getTagSwatchClass(color)
                  )}
                />
                <span className="flex-1 text-left">{label}</span>
                {selected && <Check className="size-4 shrink-0" />}
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
