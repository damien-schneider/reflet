"use client";

import { toast } from "sonner";

import { cn } from "@/lib/utils";

const FALLBACK_LABEL = "—";

export function WorkItemIdentifier({
  identifier,
  className,
}: {
  identifier: string | null | undefined;
  className?: string;
}) {
  if (!identifier) {
    return (
      <span
        aria-label="No identifier"
        className={cn(
          "select-none font-mono text-muted-foreground/60 text-xs",
          className
        )}
        role="note"
      >
        {FALLBACK_LABEL}
      </span>
    );
  }

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(identifier);
      toast.success(`Copied ${identifier}`);
    } catch {
      toast.error("Failed to copy identifier");
    }
  };

  return (
    <button
      aria-label={`Copy identifier ${identifier}`}
      className={cn(
        "rounded-sm font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground",
        "px-1.5 py-0.5",
        className
      )}
      onClick={handleClick}
      type="button"
    >
      {identifier}
    </button>
  );
}
