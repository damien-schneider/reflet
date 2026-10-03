import { cn } from "@ctrl-ui/react/lib/cn";
import type { VariantProps } from "class-variance-authority";
import { type ComponentPropsWithRef, type ElementType, type Ref } from "react";
import {
  h1Variants,
  h2Variants,
  h3Variants,
  leadVariants,
  textVariants,
} from "@/components/ui/typography-variants";

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

type LeadProps = ComponentPropsWithRef<"p"> & VariantProps<typeof leadVariants>;

const Lead = ({ size, className, ref, ...props }: LeadProps) => (
  <p className={cn(leadVariants({ size }), className)} ref={ref} {...props} />
);

type InlineCodeProps = ComponentPropsWithRef<"code">;

const InlineCode = ({ className, ref, ...props }: InlineCodeProps) => (
  <code
    className={cn(
      "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.9em]",
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

export { Blockquote, H1, H2, H3, InlineCode, Lead, Muted, Text };
