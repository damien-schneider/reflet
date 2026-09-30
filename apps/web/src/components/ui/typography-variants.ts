import { cva } from "class-variance-authority";

const h1Variants = cva("font-display text-balance text-foreground", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "text-5xl leading-tight tracking-tight",
      page: "text-4xl leading-tight tracking-tight sm:text-5xl",
    },
  },
});

const h2Variants = cva("font-display text-balance text-foreground", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      card: "text-xl font-medium",
      default: "text-3xl leading-snug tracking-tight",
    },
  },
});

const h3Variants = cva("font-display text-balance text-foreground", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      card: "text-xl font-medium",
      default: "text-2xl leading-snug tracking-tight",
    },
  },
});

const textVariants = cva("text-foreground", {
  defaultVariants: {
    align: "left",
    variant: "body",
  },
  variants: {
    align: {
      center: "text-center",
      left: "text-start",
      right: "text-end",
    },
    variant: {
      body: "text-base leading-relaxed",
      bodySmall: "text-sm leading-relaxed",
      link: "text-brand-text underline underline-offset-4 hover:text-brand-text/80",
    },
  },
});

const leadVariants = cva("font-normal text-muted-foreground leading-relaxed", {
  defaultVariants: {
    size: "default",
  },
  variants: {
    size: {
      default: "text-base sm:text-xl",
      lg: "text-body-lg sm:text-heading-3",
      sm: "text-heading-4 sm:text-body-lg",
    },
  },
});

export { h1Variants, h2Variants, h3Variants, leadVariants, textVariants };
