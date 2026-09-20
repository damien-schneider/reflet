"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Check } from "@phosphor-icons/react";

import type { TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const PILL_COLOR_STYLES: Record<string, { active: string; base: string }> = {
  blue: {
    active: "bg-tag-blue/15 text-tag-blue-text",
    base: "text-tag-blue-text",
  },
  brown: {
    active: "bg-tag-brown/15 text-tag-brown-text",
    base: "text-tag-brown-text",
  },
  default: {
    active: "bg-muted text-muted-foreground",
    base: "text-muted-foreground",
  },
  gray: {
    active: "bg-muted text-muted-foreground",
    base: "text-muted-foreground",
  },
  green: {
    active: "bg-tag-green/15 text-tag-green-text",
    base: "text-tag-green-text",
  },
  orange: {
    active: "bg-tag-orange/15 text-tag-orange-text",
    base: "text-tag-orange-text",
  },
  pink: {
    active: "bg-tag-pink/15 text-tag-pink-text",
    base: "text-tag-pink-text",
  },
  purple: {
    active: "bg-tag-purple/15 text-tag-purple-text",
    base: "text-tag-purple-text",
  },
  red: {
    active: "bg-tag-red/15 text-tag-red-text",
    base: "text-tag-red-text",
  },
  yellow: {
    active: "bg-tag-yellow/15 text-tag-yellow-text",
    base: "text-tag-yellow-text",
  },
};

interface TagPillProps extends ButtonPrimitive.Props {
  active?: boolean;
  color?: TagColor | string;
}

export function TagPill({
  className,
  color,
  active,
  children,
  ...props
}: TagPillProps) {
  const colorStyles =
    PILL_COLOR_STYLES[color ?? "default"] ?? PILL_COLOR_STYLES.default;

  return (
    <ButtonPrimitive
      className={cn(
        "group/tag-pill inline-flex h-7 shrink-0 cursor-pointer select-none items-center justify-center gap-0 whitespace-nowrap rounded-full bg-muted px-3 text-sm outline-none transition-colors hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        active ? colorStyles.active : colorStyles.base,
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex overflow-hidden transition-[max-width,margin-right] duration-200 ease-out",
          active ? "mr-1 max-w-4" : "max-w-0"
        )}
      >
        <Check className="size-3.5 shrink-0" weight="bold" />
      </span>
      {children}
    </ButtonPrimitive>
  );
}
