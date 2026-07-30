import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { migrateHexToNamedColor, type TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-sm px-2 font-semibold text-xs transition-all focus-visible:ring-2 focus-visible:ring-offset-1 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        blue: "bg-[#d3e5ef] text-[#0b6e99] dark:bg-[#529cca26] dark:text-[#5e87c9]",
        // Additional colors
        brown:
          "bg-[#eee0da] text-[#64473a] dark:bg-[#93726426] dark:text-[#b4836d]",
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        destructive:
          "bg-destructive/15 text-destructive [a&]:hover:bg-destructive/25",
        ghost:
          "text-muted-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground",
        // Notion-style color variants
        gray: "bg-[#f1f1ef] text-[#787774] dark:bg-[#ffffff0f] dark:text-[#9b9a97]",
        green:
          "bg-[#dbeddb] text-[#0f7b6c] dark:bg-[#4dab9a24] dark:text-[#529e72]",
        link: "text-primary underline-offset-4 hover:underline",
        orange:
          "bg-[#fadec9] text-[#d9730d] dark:bg-[#ffa34426] dark:text-[#c77d48]",
        outline:
          "border border-border bg-background text-foreground [a&]:hover:bg-muted",
        pink: "bg-[#f5e0e9] text-[#ad1a72] dark:bg-[#e255a126] dark:text-[#b65590]",
        purple:
          "bg-[#e8deee] text-[#6940a5] dark:bg-[#9a6dd726] dark:text-[#9a6dd7]",
        red: "bg-[#ffe2dd] text-[#e03e3e] dark:bg-[#ea575226] dark:text-[#df5452]",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        yellow:
          "bg-[#fdecc8] text-[#dfab01] dark:bg-[#ffdc4924] dark:text-[#c29343]",
      },
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
  blue: "blue",
  brown: "brown",
  default: "gray",
  gray: "gray",
  green: "green",
  orange: "orange",
  pink: "pink",
  purple: "purple",
  red: "red",
  yellow: "yellow",
};

interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Tag color - maps to a color variant */
  color?: TagColor | string;
}

function Badge({ className, variant, color, render, ...props }: BadgeProps) {
  // If color is provided, resolve it (handles both named and legacy hex colors)
  const resolvedColor = color
    ? colorToVariant[color]
      ? color
      : migrateHexToNamedColor(color)
    : undefined;
  const resolvedVariant = resolvedColor
    ? (colorToVariant[resolvedColor] ?? "gray")
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

export { Badge, type BadgeColor, badgeVariants, TAG_COLORS };
