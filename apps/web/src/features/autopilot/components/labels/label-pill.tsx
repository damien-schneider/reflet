"use client";

import { IconX } from "@tabler/icons-react";
import { memo } from "react";

import { cn } from "@/lib/utils";

import { resolveLabelColor } from "./label-colors";

interface LabelPillProps {
  className?: string;
  color: string | undefined;
  name: string;
  onRemove?: () => void;
}

/**
 * Compact colored chip rendered inline next to work item titles.
 *
 * - Renders a colored dot derived from the preset palette, then the label
 *   name. When `onRemove` is provided, an X button appears on the right and
 *   triggers the callback (without bubbling to parent click handlers).
 * - Memoized: this component renders inside lists with a high fan-out
 *   (one per label, per task card), so referential stability for each
 *   (name, color) pair avoids needless re-renders.
 */
export const LabelPill = memo(function LabelPill({
  name,
  color,
  onRemove,
  className,
}: LabelPillProps) {
  const palette = resolveLabelColor(color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs",
        palette.chip,
        palette.text,
        palette.border,
        className
      )}
      data-slot="label-pill"
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", palette.swatch)}
        data-testid="label-pill-dot"
      />
      <span className="max-w-[12rem] truncate">{name}</span>
      {onRemove ? (
        <button
          aria-label={`Remove ${name} label`}
          className="-mr-0.5 ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <IconX className="size-2.5" />
        </button>
      ) : null}
    </span>
  );
});
