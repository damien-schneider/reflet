"use client";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface ShortcutHintBarProps {
  className?: string;
  hasSelectedConversation: boolean;
  visible: boolean;
}

export function ShortcutHintBar({
  hasSelectedConversation,
  visible,
  className,
}: ShortcutHintBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t bg-muted/30 px-4 py-1.5 text-muted-foreground text-xs",
        className
      )}
    >
      <span className="flex items-center gap-1.5">
        <Kbd>J</Kbd>
        <Kbd>K</Kbd> navigate
      </span>

      {hasSelectedConversation && (
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
