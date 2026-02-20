import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithRef, type ElementType, type Ref } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// H1 Variants - Hero and page titles
// ============================================================================
const h1Variants = cva(
  "font-display text-balance text-olive-950 dark:text-olive-100",
  {
    variants: {
      variant: {
        default: "text-5xl leading-tight tracking-tight",
        hero: "text-4xl leading-[1.1] tracking-tight sm:text-6xl sm:leading-tight md:text-7xl",
        page: "text-4xl leading-tight tracking-tight sm:text-5xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ============================================================================
// H2 Variants - Section and card titles
// ============================================================================
const h2Variants = cva(
  "font-display text-balance text-olive-950 dark:text-olive-100",
  {
    variants: {
      variant: {
        default: "text-3xl leading-snug tracking-tight",
        section: "text-4xl tracking-tight sm:text-5xl",
        card: "text-xl font-medium text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ============================================================================
// H3 Variants - Card and item titles
// ============================================================================
const h3Variants = cva(
  "font-display text-balance text-olive-950 dark:text-olive-100",
  {
    variants: {
      variant: {
        default: "text-2xl leading-snug tracking-tight",
        card: "text-xl font-medium text-foreground",
        cardBold: "text-xl font-semibold text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ============================================================================
// Text Variants - Body text with semantic variants
// ============================================================================
const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      body: "text-base leading-relaxed",
      bodyLarge: "text-lg leading-relaxed",
      bodySmall: "text-sm leading-relaxed",
      caption: "text-xs leading-normal text-muted-foreground",
      label: "text-sm font-medium leading-none",
      labelBold: "text-sm font-semibold leading-none",
      overline:
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
      link: "text-olive-600 underline underline-offset-4 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 transition-colors",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
    align: "left",
  },
});

// ============================================================================
// Heading Components (H1, H2, H3) - Uses Instrument Serif font
// ============================================================================

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

// ============================================================================
// Text Component - General purpose text with variants
// ============================================================================

type TextElement = "p" | "span" | "div" | "label" | "a";

type TextProps<T extends TextElement = "p"> = ComponentPropsWithRef<T> &
  VariantProps<typeof textVariants> & {
    as?: T;
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
      className={cn(textVariants({ variant, align }), className)}
      ref={ref as Ref<never>}
      {...props}
    />
  );
};

// ============================================================================
// Muted Text - For secondary/muted content
// ============================================================================

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

// ============================================================================
// Lead Text - For intro paragraphs
// ============================================================================

type LeadProps = ComponentPropsWithRef<"p">;

const Lead = ({ className, ref, ...props }: LeadProps) => (
  <p
    className={cn("text-muted-foreground text-base sm:text-xl", className)}
    ref={ref}
    {...props}
  />
);

// ============================================================================
// Large Text - Emphasized body text
// ============================================================================

type LargeProps = ComponentPropsWithRef<"p">;

const Large = ({ className, ref, ...props }: LargeProps) => (
  <p className={cn("font-semibold text-lg", className)} ref={ref} {...props} />
);

// ============================================================================
// Small Text - Fine print, captions
// ============================================================================

type SmallProps = ComponentPropsWithRef<"small">;

const Small = ({ className, ref, ...props }: SmallProps) => (
  <small
    className={cn("font-medium text-sm leading-none", className)}
    ref={ref}
    {...props}
  />
);

// ============================================================================
// Inline Code
// ============================================================================

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

// ============================================================================
// Blockquote
// ============================================================================

type BlockquoteProps = ComponentPropsWithRef<"blockquote">;

const Blockquote = ({ className, ref, ...props }: BlockquoteProps) => (
  <blockquote
    className={cn("mt-6 border-olive-300 border-l-2 pl-6 italic", className)}
    ref={ref}
    {...props}
  />
);

// ============================================================================
// Exports
// ============================================================================

export {
  H1,
  H2,
  H3,
  Text,
  Muted,
  Lead,
  Large,
  Small,
  InlineCode,
  Blockquote,
  h1Variants,
  h2Variants,
  h3Variants,
  textVariants,
};
