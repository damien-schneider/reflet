import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithRef, type ElementType, type Ref } from "react";

import { cn } from "@/lib/utils";

const h1Variants = cva("font-display text-balance text-foreground", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "text-5xl leading-tight tracking-tight",
      hero: "text-4xl leading-[1.1] tracking-tight sm:text-6xl sm:leading-tight md:text-7xl",
      landing:
        "text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] tracking-[-0.03em]",
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
      landing: "text-[clamp(1.8rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em]",
      section: "text-4xl tracking-tight sm:text-5xl",
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
      cardBold: "text-xl font-semibold",
      default: "text-2xl leading-snug tracking-tight",
      landing:
        "text-[clamp(1.4rem,3vw,2rem)] leading-[1.15] tracking-[-0.01em]",
      section: "font-sans text-base font-medium text-pretty",
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
      left: "text-left",
      right: "text-right",
    },
    variant: {
      body: "text-base leading-relaxed",
      bodyLarge: "text-lg leading-relaxed",
      bodySmall: "text-sm leading-relaxed",
      caption: "text-xs leading-normal text-muted-foreground",
      eyebrow:
        "text-caption font-semibold uppercase tracking-[0.15em] text-brand-text",
      label: "text-sm font-medium leading-none",
      labelBold: "text-sm font-semibold leading-none",
      link: "text-brand-text underline underline-offset-4 hover:text-brand-text/80 transition-colors",
      overline:
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
    },
  },
});

type H1Props = ComponentPropsWithRef<"h1"> & VariantProps<typeof h1Variants>;

const H1 = ({ variant, className, ref, ...props }: H1Props) => (
  <h1 className={cn(h1Variants({ variant }), className)} ref={ref} {...props} />
);

type H2Props = ComponentPropsWithRef<"h2"> & VariantProps<typeof h2Variants>;

const H2 = ({ variant, className, ref, ...props }: H2Props) => (
  <h2 className={cn(h2Variants({ variant }), className)} ref={ref} {...props} />
);

type H3Props = ComponentPropsWithRef<"h3"> & VariantProps<typeof h3Variants>;

const H3 = ({ variant, className, ref, ...props }: H3Props) => (
  <h3 className={cn(h3Variants({ variant }), className)} ref={ref} {...props} />
);

type TextElement = "p" | "span" | "div" | "label" | "a";

type TextProps = ComponentPropsWithRef<"p"> &
  VariantProps<typeof textVariants> & {
    as?: TextElement;
  };

const Text = ({
  as = "p",
  variant,
  align,
  className,
  ref,
  ...props
}: TextProps) => {
  const Component: ElementType = as;
  return (
    <Component
      className={cn(textVariants({ align, variant }), className)}
      ref={ref as Ref<never>}
      {...(props as Record<string, unknown>)}
    />
  );
};

type MutedProps = ComponentPropsWithRef<"p"> & {
  as?: TextElement;
};

const Muted = ({ as = "p", className, ref, ...props }: MutedProps) => {
  const Component: ElementType = as;
  return (
    <Component
      className={cn("text-muted-foreground text-sm", className)}
      ref={ref as Ref<never>}
      {...(props as Record<string, unknown>)}
    />
  );
};

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

type LeadProps = ComponentPropsWithRef<"p"> & VariantProps<typeof leadVariants>;

const Lead = ({ size, className, ref, ...props }: LeadProps) => (
  <p className={cn(leadVariants({ size }), className)} ref={ref} {...props} />
);

type LargeProps = ComponentPropsWithRef<"p">;

const Large = ({ className, ref, ...props }: LargeProps) => (
  <p className={cn("font-semibold text-lg", className)} ref={ref} {...props} />
);

type SmallProps = ComponentPropsWithRef<"small">;

const Small = ({ className, ref, ...props }: SmallProps) => (
  <small
    className={cn("font-medium text-sm leading-none", className)}
    ref={ref}
    {...props}
  />
);

type InlineCodeProps = ComponentPropsWithRef<"code">;

const InlineCode = ({ className, ref, ...props }: InlineCodeProps) => (
  <code
    className={cn(
      "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
      className
    )}
    ref={ref}
    {...props}
  />
);

type BlockquoteProps = ComponentPropsWithRef<"blockquote">;

const Blockquote = ({ className, ref, ...props }: BlockquoteProps) => (
  <blockquote
    className={cn("mt-6 border-border border-l-2 pl-6 italic", className)}
    ref={ref}
    {...props}
  />
);

export {
  Blockquote,
  H1,
  H2,
  H3,
  h1Variants,
  h2Variants,
  h3Variants,
  InlineCode,
  Large,
  Lead,
  leadVariants,
  Muted,
  Small,
  Text,
  textVariants,
};
