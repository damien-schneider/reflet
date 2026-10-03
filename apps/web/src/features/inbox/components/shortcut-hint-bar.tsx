"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Kbd } from "@ctrl-ui/react/ui/kbd";

interface ShortcutHintBarProps {
  canActOnSelection: boolean;
  className?: string;
  visible: boolean;
}

export function ShortcutHintBar({
  canActOnSelection,
  visible,
  className,
}: ShortcutHintBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex pointer-coarse:hidden flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/30 px-4 py-1.5 text-muted-foreground text-xs",
        className
      )}
    >
      <span className="flex items-center gap-1.5">
        <Kbd>J</Kbd>
        <Kbd>K</Kbd> navigate
      </span>

      {canActOnSelection && (
        <>
          <span className="flex items-center gap-1.5">
            <Kbd>R</Kbd> reply
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>E</Kbd> resolve
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>C</Kbd> close
          </span>
        </>
      )}

      <span className="flex items-center gap-1.5">
        <Kbd>/</Kbd> search
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>?</Kbd> toggle hints
      </span>
    </div>
  );
}
