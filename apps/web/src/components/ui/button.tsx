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

// Pill color classes - base and active states
const pillColorStyles: Record<string, { base: string; active: string }> = {
  default: {
    base: "text-gray-600 dark:text-gray-400",
    active: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
  },
  gray: {
    base: "text-gray-600 dark:text-gray-400",
    active: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
  },
  brown: {
    base: "text-amber-700 dark:text-amber-400",
    active: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  },
  orange: {
    base: "text-orange-600 dark:text-orange-400",
    active: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  yellow: {
    base: "text-yellow-700 dark:text-yellow-500",
    active: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-500",
  },
  green: {
    base: "text-green-600 dark:text-green-400",
    active: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  blue: {
    base: "text-blue-600 dark:text-blue-400",
    active: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  purple: {
    base: "text-purple-600 dark:text-purple-400",
    active: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  pink: {
    base: "text-pink-600 dark:text-pink-400",
    active: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  },
  red: {
    base: "text-red-600 dark:text-red-400",
    active: "bg-red-500/15 text-red-700 dark:text-red-400",
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
