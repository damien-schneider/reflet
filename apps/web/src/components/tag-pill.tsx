"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Check } from "@phosphor-icons/react";

import type { TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const PILL_COLOR_STYLES: Record<string, { active: string; base: string }> = {
  blue: {
    active:
      "bg-[#d3e5ef] text-[#0b6e99] dark:bg-[#529cca26] dark:text-[#5e87c9]",
    base: "text-[#0b6e99] dark:text-[#5e87c9]",
  },
  brown: {
    active:
      "bg-[#eee0da] text-[#64473a] dark:bg-[#93726426] dark:text-[#b4836d]",
    base: "text-[#64473a] dark:text-[#b4836d]",
  },
  default: {
    active:
      "bg-[#f1f1ef] text-[#787774] dark:bg-[#ffffff0f] dark:text-[#9b9a97]",
    base: "text-[#787774] dark:text-[#9b9a97]",
  },
  gray: {
    active:
      "bg-[#f1f1ef] text-[#787774] dark:bg-[#ffffff0f] dark:text-[#9b9a97]",
    base: "text-[#787774] dark:text-[#9b9a97]",
  },
  green: {
    active:
      "bg-[#dbeddb] text-[#0f7b6c] dark:bg-[#4dab9a24] dark:text-[#529e72]",
    base: "text-[#0f7b6c] dark:text-[#529e72]",
  },
  orange: {
    active:
      "bg-[#fadec9] text-[#d9730d] dark:bg-[#ffa34426] dark:text-[#c77d48]",
    base: "text-[#d9730d] dark:text-[#c77d48]",
  },
  pink: {
    active:
      "bg-[#f5e0e9] text-[#ad1a72] dark:bg-[#e255a126] dark:text-[#b65590]",
    base: "text-[#ad1a72] dark:text-[#b65590]",
  },
  purple: {
    active:
      "bg-[#e8deee] text-[#6940a5] dark:bg-[#9a6dd726] dark:text-[#9a6dd7]",
    base: "text-[#6940a5] dark:text-[#9a6dd7]",
  },
  red: {
    active:
      "bg-[#ffe2dd] text-[#e03e3e] dark:bg-[#ea575226] dark:text-[#df5452]",
    base: "text-[#e03e3e] dark:text-[#df5452]",
  },
  yellow: {
    active:
      "bg-[#fdecc8] text-[#dfab01] dark:bg-[#ffdc4924] dark:text-[#c29343]",
    base: "text-[#dfab01] dark:text-[#c29343]",
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
        "group/tag-pill inline-flex h-7 shrink-0 cursor-pointer select-none items-center justify-center gap-0 whitespace-nowrap rounded-full bg-muted px-3 text-sm outline-none transition-all hover:bg-muted/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        active ? colorStyles.active : colorStyles.base,
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex overflow-hidden transition-all duration-200 ease-out",
          active ? "mr-1 max-w-4" : "max-w-0"
        )}
      >
        <Check className="size-3.5 shrink-0" weight="bold" />
      </span>
      {children}
    </ButtonPrimitive>
  );
}
