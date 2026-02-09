"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Check } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";

import type { TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-olive-600 text-olive-100 [a]:hover:bg-olive-700",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-olive-100 text-olive-950 hover:bg-olive-200 aria-expanded:bg-olive-100 aria-expanded:text-olive-950",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        link: "text-olive-600 underline-offset-4 hover:underline",
        // Pill variant - use with color prop and active prop
        pill: "rounded-full bg-muted hover:bg-muted/80 gap-0",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Pill size
        pill: "h-7 rounded-full px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Pill color classes - Notion-style base and active states
const pillColorStyles: Record<string, { base: string; active: string }> = {
  default: {
    base: "text-[#787774] dark:text-[#9b9a97]",
    active:
      "bg-[#f1f1ef] text-[#787774] dark:bg-[#ffffff0f] dark:text-[#9b9a97]",
  },
  gray: {
    base: "text-[#787774] dark:text-[#9b9a97]",
    active:
      "bg-[#f1f1ef] text-[#787774] dark:bg-[#ffffff0f] dark:text-[#9b9a97]",
  },
  brown: {
    base: "text-[#64473a] dark:text-[#b4836d]",
    active:
      "bg-[#eee0da] text-[#64473a] dark:bg-[#93726426] dark:text-[#b4836d]",
  },
  orange: {
    base: "text-[#d9730d] dark:text-[#c77d48]",
    active:
      "bg-[#fadec9] text-[#d9730d] dark:bg-[#ffa34426] dark:text-[#c77d48]",
  },
  yellow: {
    base: "text-[#dfab01] dark:text-[#c29343]",
    active:
      "bg-[#fdecc8] text-[#dfab01] dark:bg-[#ffdc4924] dark:text-[#c29343]",
  },
  green: {
    base: "text-[#0f7b6c] dark:text-[#529e72]",
    active:
      "bg-[#dbeddb] text-[#0f7b6c] dark:bg-[#4dab9a24] dark:text-[#529e72]",
  },
  blue: {
    base: "text-[#0b6e99] dark:text-[#5e87c9]",
    active:
      "bg-[#d3e5ef] text-[#0b6e99] dark:bg-[#529cca26] dark:text-[#5e87c9]",
  },
  purple: {
    base: "text-[#6940a5] dark:text-[#9a6dd7]",
    active:
      "bg-[#e8deee] text-[#6940a5] dark:bg-[#9a6dd726] dark:text-[#9a6dd7]",
  },
  pink: {
    base: "text-[#ad1a72] dark:text-[#b65590]",
    active:
      "bg-[#f5e0e9] text-[#ad1a72] dark:bg-[#e255a126] dark:text-[#b65590]",
  },
  red: {
    base: "text-[#e03e3e] dark:text-[#df5452]",
    active:
      "bg-[#ffe2dd] text-[#e03e3e] dark:bg-[#ea575226] dark:text-[#df5452]",
  },
};

interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  /** Color for pill variant */
  color?: TagColor | string;
  /** Active state for pill variant - shows check icon and active styling */
  active?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  color,
  active,
  children,
  ...props
}: ButtonProps) {
  const isPill = variant === "pill";
  const colorStyles = isPill
    ? (pillColorStyles[color ?? "default"] ?? pillColorStyles.default)
    : null;

  return (
    <ButtonPrimitive
      className={cn(
        buttonVariants({ variant, size }),
        colorStyles && (active ? colorStyles.active : colorStyles.base),
        className
      )}
      data-slot="button"
      {...props}
    >
      {isPill && (
        <span
          className={cn(
            "inline-flex overflow-hidden transition-all duration-200 ease-out",
            active ? "max-w-4 mr-1" : "max-w-0"
          )}
        >
          <Check className="size-3.5 shrink-0" weight="bold" />
        </span>
      )}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
