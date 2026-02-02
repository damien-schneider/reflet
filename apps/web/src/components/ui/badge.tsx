import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-2.5 py-1 font-medium text-xs transition-all focus-visible:ring-2 focus-visible:ring-offset-1 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&>svg]:pointer-events-none [&>svg]:size-3.5",
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
        // Tailwind color variants - soft pastel style matching the reference image
        slate:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        neutral:
          "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        stone:
          "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
        red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
        orange:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
        amber:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
        yellow:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
        lime: "bg-lime-100 text-lime-700 dark:bg-lime-900/50 dark:text-lime-400",
        green:
          "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
        emerald:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
        teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
        cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400",
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
        indigo:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400",
        violet:
          "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400",
        purple:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
        fuchsia:
          "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-400",
        pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400",
        rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ className, variant })),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
