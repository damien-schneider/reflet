import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type { TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md px-2 py-0.5 font-medium text-xs transition-all focus-visible:ring-2 focus-visible:ring-offset-1 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/15 text-destructive [a&]:hover:bg-destructive/25",
        outline:
          "border border-border bg-background text-foreground [a&]:hover:bg-muted",
        ghost:
          "text-muted-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Tailwind color variants
        gray: "bg-gray-50 text-gray-600 dark:bg-gray-400/10 dark:text-gray-400",
        red: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400",
        orange:
          "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400",
        yellow:
          "bg-yellow-50 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-500",
        green:
          "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-400",
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
        purple:
          "bg-purple-50 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400",
        pink: "bg-pink-50 text-pink-700 dark:bg-pink-400/10 dark:text-pink-400",
        // Additional colors
        brown:
          "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Tag colors that can be used with the color prop
const TAG_COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

type BadgeColor = (typeof TAG_COLORS)[number];

// Map tag colors to badge variants
const colorToVariant: Record<
  string,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  default: "gray",
  gray: "gray",
  brown: "brown",
  orange: "orange",
  yellow: "yellow",
  green: "green",
  blue: "blue",
  purple: "purple",
  pink: "pink",
  red: "red",
};

interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Tag color - maps to a color variant */
  color?: TagColor | string;
}

function Badge({ className, variant, color, render, ...props }: BadgeProps) {
  // If color is provided, use it to determine the variant
  const resolvedVariant = color
    ? (colorToVariant[color] ?? "gray")
    : (variant ?? "default");

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ className, variant: resolvedVariant })),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant: resolvedVariant,
    },
  });
}

export { Badge, badgeVariants, TAG_COLORS, type BadgeColor };
