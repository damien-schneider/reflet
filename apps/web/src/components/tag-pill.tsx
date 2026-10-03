"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button, type ButtonProps } from "@ctrl-ui/react/ui/button";
import { getTagSwatchClass, type TagColor } from "@/lib/tag-colors";

interface TagPillProps extends Omit<ButtonProps, "color" | "active"> {
  active?: boolean;
  color?: TagColor | string;
}

export function TagPill({
  active = false,
  color,
  children,
  ...props
}: TagPillProps) {
  return (
    <Button
      active={active}
      aria-pressed={active}
      size="xs"
      variant="ghost"
      {...props}
    >
      {color && (
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            getTagSwatchClass(color)
          )}
        />
      )}
      {children}
    </Button>
  );
}
