import { cva } from "class-variance-authority";

export const controlSize = cva("", {
  variants: {
    size: {
      xs: "h-[var(--control-h-xs)] gap-1 px-[calc(var(--padding-x)*0.6)] text-caption",
      sm: "h-[var(--control-h-sm)] gap-1.5 px-[calc(var(--padding-x)*0.75)] text-label",
      md: "h-[var(--control-h-md)] gap-1.5 px-[var(--padding-x)] text-body",
      lg: "h-[var(--control-h-lg)] gap-2 px-[calc(var(--padding-x)*1.25)] text-body",
    },
  },
  defaultVariants: {
    size: "md",
  },
});
